/**
 * The server's half of WebAuthn (passkeys), hand-written on node:crypto: a CBOR
 * reader for the parts authenticators send, authenticator data, COSE public keys
 * (ES256, EdDSA, RS256), and the checks for a registration and a sign-in. No
 * attestation is asked for or checked: a passkey proves the person holds it, not
 * which device made it. Pure: callers pass the expected challenge, origin and RP ID.
 */
import {
  createHash,
  createPublicKey,
  timingSafeEqual,
  verify,
  type KeyObject,
} from "node:crypto";

/** COSE algorithms we accept, in the order offered to authenticators. */
export const COSE_ALGORITHMS = [-7, -8, -257] as const;

export class WebAuthnError extends Error {
  override name = "WebAuthnError";
}

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function fromBase64Url(text: string): Buffer {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new WebAuthnError("Not base64url");
  return Buffer.from(text, "base64url");
}

// --- CBOR (RFC 8949), only what WebAuthn uses ---------------------------------

type Cbor =
  | number
  | bigint
  | string
  | Buffer
  | boolean
  | null
  | undefined
  | Cbor[]
  | Map<Cbor, Cbor>;

const MAX_DEPTH = 16;

function readCbor(
  bytes: Buffer,
  start: number,
  depth = 0,
): { value: Cbor; end: number } {
  if (depth > MAX_DEPTH) throw new WebAuthnError("CBOR nested too deeply");
  if (start >= bytes.length) throw new WebAuthnError("CBOR ended early");
  const initial = bytes[start] ?? 0;
  const major = initial >> 5;
  const info = initial & 0x1f;
  let offset = start + 1;
  const need = (n: number) => {
    if (offset + n > bytes.length) throw new WebAuthnError("CBOR ended early");
  };

  let length: number;
  if (info < 24) length = info;
  else if (info === 24) {
    need(1);
    length = bytes.readUInt8(offset);
    offset += 1;
  } else if (info === 25) {
    need(2);
    length = bytes.readUInt16BE(offset);
    offset += 2;
  } else if (info === 26) {
    need(4);
    length = bytes.readUInt32BE(offset);
    offset += 4;
  } else if (info === 27) {
    need(8);
    const big = bytes.readBigUInt64BE(offset);
    offset += 8;
    if (big > BigInt(Number.MAX_SAFE_INTEGER))
      throw new WebAuthnError("CBOR number too large");
    length = Number(big);
  } else throw new WebAuthnError("Unsupported CBOR encoding");

  switch (major) {
    case 0:
      return { value: length, end: offset };
    case 1:
      return { value: -1 - length, end: offset };
    case 2: {
      need(length);
      return {
        value: Buffer.from(bytes.subarray(offset, offset + length)),
        end: offset + length,
      };
    }
    case 3: {
      need(length);
      return {
        value: bytes.toString("utf8", offset, offset + length),
        end: offset + length,
      };
    }
    case 4: {
      const items: Cbor[] = [];
      for (let i = 0; i < length; i++) {
        const item = readCbor(bytes, offset, depth + 1);
        items.push(item.value);
        offset = item.end;
      }
      return { value: items, end: offset };
    }
    case 5: {
      const map = new Map<Cbor, Cbor>();
      for (let i = 0; i < length; i++) {
        const key = readCbor(bytes, offset, depth + 1);
        const value = readCbor(bytes, key.end, depth + 1);
        map.set(key.value, value.value);
        offset = value.end;
      }
      return { value: map, end: offset };
    }
    case 7:
      if (info === 20) return { value: false, end: offset };
      if (info === 21) return { value: true, end: offset };
      if (info === 22) return { value: null, end: offset };
      if (info === 23) return { value: undefined, end: offset };
      throw new WebAuthnError("Unsupported CBOR value");
    default:
      throw new WebAuthnError("Unsupported CBOR type");
  }
}

/** One CBOR item that must fill `bytes` exactly. */
export function decodeCbor(bytes: Buffer): Cbor {
  const { value, end } = readCbor(bytes, 0);
  if (end !== bytes.length) throw new WebAuthnError("Trailing CBOR data");
  return value;
}

// --- Authenticator data -----------------------------------------------------------

export interface AuthenticatorData {
  rpIdHash: Buffer;
  /** User present, user verified, backup eligible, backed up. */
  flags: { up: boolean; uv: boolean; be: boolean; bs: boolean };
  signCount: number;
  /** Only at registration (the AT flag). */
  credential?: { id: Buffer; publicKey: Buffer };
}

export function parseAuthenticatorData(bytes: Buffer): AuthenticatorData {
  if (bytes.length < 37)
    throw new WebAuthnError("Authenticator data too short");
  const flagByte = bytes[32] ?? 0;
  const data: AuthenticatorData = {
    rpIdHash: Buffer.from(bytes.subarray(0, 32)),
    flags: {
      up: (flagByte & 0x01) !== 0,
      uv: (flagByte & 0x04) !== 0,
      be: (flagByte & 0x08) !== 0,
      bs: (flagByte & 0x10) !== 0,
    },
    signCount: bytes.readUInt32BE(33),
  };
  if ((flagByte & 0x40) !== 0) {
    // aaguid (16), credential ID length (2), credential ID, then the COSE key.
    if (bytes.length < 55) throw new WebAuthnError("Credential data too short");
    const idLength = bytes.readUInt16BE(53);
    const idEnd = 55 + idLength;
    if (bytes.length < idEnd)
      throw new WebAuthnError("Credential ID too short");
    const key = readCbor(bytes, idEnd);
    data.credential = {
      id: Buffer.from(bytes.subarray(55, idEnd)),
      publicKey: Buffer.from(bytes.subarray(idEnd, key.end)),
    };
  }
  return data;
}

// --- COSE keys ----------------------------------------------------------------------

function bytesAt(map: Map<Cbor, Cbor>, key: number): Buffer {
  const value = map.get(key);
  if (!Buffer.isBuffer(value)) throw new WebAuthnError("COSE key incomplete");
  return value;
}

/** A COSE_Key as a Node key, with its algorithm. Only the ones we offer. */
export function coseToKey(cose: Buffer): { algorithm: number; key: KeyObject } {
  const map = decodeCbor(cose);
  if (!(map instanceof Map)) throw new WebAuthnError("COSE key isn't a map");
  const kty = map.get(1);
  const algorithm = map.get(3);
  const b64 = (key: number) => bytesAt(map, key).toString("base64url");
  try {
    if (kty === 2 && algorithm === -7 && map.get(-1) === 1)
      return {
        algorithm,
        key: createPublicKey({
          key: { kty: "EC", crv: "P-256", x: b64(-2), y: b64(-3) },
          format: "jwk",
        }),
      };
    if (kty === 1 && algorithm === -8 && map.get(-1) === 6)
      return {
        algorithm,
        key: createPublicKey({
          key: { kty: "OKP", crv: "Ed25519", x: b64(-2) },
          format: "jwk",
        }),
      };
    if (kty === 3 && algorithm === -257)
      return {
        algorithm,
        key: createPublicKey({
          key: { kty: "RSA", n: b64(-1), e: b64(-2) },
          format: "jwk",
        }),
      };
  } catch (error) {
    if (error instanceof WebAuthnError) throw error;
    throw new WebAuthnError("COSE key isn't a valid key");
  }
  throw new WebAuthnError("Unsupported key type or algorithm");
}

function signatureValid(
  algorithm: number,
  key: KeyObject,
  data: Buffer,
  signature: Buffer,
): boolean {
  try {
    if (algorithm === -7)
      return verify("sha256", data, { key, dsaEncoding: "der" }, signature);
    if (algorithm === -8) return verify(null, data, key, signature);
    if (algorithm === -257) return verify("sha256", data, key, signature);
  } catch {
    return false;
  }
  return false;
}

// --- Client data and the two ceremonies ---------------------------------------------

export interface Expected {
  /** base64url, as sent in the options. */
  challenge: string;
  /** The site's origin, e.g. https://www.trilleo.net. */
  origin: string;
  /** The RP ID: the site's hostname. */
  rpId: string;
}

const sha256 = (data: Buffer | string) =>
  createHash("sha256").update(data).digest();

function sameBytes(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

function checkClientData(
  clientDataJSON: Buffer,
  type: "webauthn.create" | "webauthn.get",
  expected: Expected,
): void {
  let data: unknown;
  try {
    data = JSON.parse(clientDataJSON.toString("utf8"));
  } catch {
    throw new WebAuthnError("Client data isn't JSON");
  }
  if (typeof data !== "object" || data === null)
    throw new WebAuthnError("Client data isn't an object");
  const record = data as Record<string, unknown>;
  if (record.type !== type) throw new WebAuthnError("Wrong ceremony type");
  if (
    typeof record.challenge !== "string" ||
    !sameBytes(Buffer.from(record.challenge), Buffer.from(expected.challenge))
  )
    throw new WebAuthnError("Wrong challenge");
  if (record.origin !== expected.origin)
    throw new WebAuthnError("Wrong origin");
  if (record.crossOrigin === true)
    throw new WebAuthnError("Cross-origin ceremony");
}

function checkAuthenticatorData(data: AuthenticatorData, expected: Expected) {
  if (!sameBytes(data.rpIdHash, sha256(expected.rpId)))
    throw new WebAuthnError("Wrong RP ID");
  if (!data.flags.up) throw new WebAuthnError("User wasn't present");
  // A passkey alone signs in, so the device must have checked it's them.
  if (!data.flags.uv) throw new WebAuthnError("User wasn't verified");
}

export interface NewCredential {
  /** base64url */
  id: string;
  /** The COSE_Key, base64url. */
  publicKey: string;
  algorithm: number;
  signCount: number;
  backedUp: boolean;
}

/** Checks navigator.credentials.create()'s answer. Throws WebAuthnError if wrong. */
export function verifyRegistration(input: {
  clientDataJSON: Buffer;
  attestationObject: Buffer;
  expected: Expected;
}): NewCredential {
  checkClientData(input.clientDataJSON, "webauthn.create", input.expected);
  const attestation = decodeCbor(input.attestationObject);
  if (!(attestation instanceof Map))
    throw new WebAuthnError("Attestation isn't a map");
  const authData = attestation.get("authData");
  if (!Buffer.isBuffer(authData))
    throw new WebAuthnError("No authenticator data");
  const data = parseAuthenticatorData(authData);
  checkAuthenticatorData(data, input.expected);
  if (!data.credential) throw new WebAuthnError("No credential in the answer");
  if (data.credential.id.length < 16 || data.credential.id.length > 1023)
    throw new WebAuthnError("Odd credential ID");
  const { algorithm } = coseToKey(data.credential.publicKey);
  return {
    id: toBase64Url(data.credential.id),
    publicKey: toBase64Url(data.credential.publicKey),
    algorithm,
    signCount: data.signCount,
    backedUp: data.flags.bs,
  };
}

/**
 * Checks navigator.credentials.get()'s answer against a stored passkey. Returns the
 * new counter. A counter that didn't go up (when either side counts) means a cloned
 * authenticator: refused.
 */
export function verifyAssertion(input: {
  clientDataJSON: Buffer;
  authenticatorData: Buffer;
  signature: Buffer;
  expected: Expected;
  publicKey: string;
  signCount: number;
}): { signCount: number; backedUp: boolean } {
  checkClientData(input.clientDataJSON, "webauthn.get", input.expected);
  const data = parseAuthenticatorData(input.authenticatorData);
  checkAuthenticatorData(data, input.expected);
  const { algorithm, key } = coseToKey(fromBase64Url(input.publicKey));
  const signed = Buffer.concat([
    input.authenticatorData,
    sha256(input.clientDataJSON),
  ]);
  if (!signatureValid(algorithm, key, signed, input.signature))
    throw new WebAuthnError("Bad signature");
  if (
    (data.signCount !== 0 || input.signCount !== 0) &&
    data.signCount <= input.signCount
  )
    throw new WebAuthnError("Counter went backwards");
  return { signCount: data.signCount, backedUp: data.flags.bs };
}
