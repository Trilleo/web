/**
 * A pretend authenticator for the passkey tests (imported only by *.test.ts files,
 * so never bundled): real keys from node:crypto, and the bytes a browser would send.
 */
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
  type KeyObject,
} from "node:crypto";

type CborIn =
  number | string | boolean | Buffer | CborIn[] | Map<CborIn, CborIn>;

function head(major: number, length: number): Buffer {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 0x100) return Buffer.from([(major << 5) | 24, length]);
  if (length < 0x10000) {
    const out = Buffer.alloc(3);
    out[0] = (major << 5) | 25;
    out.writeUInt16BE(length, 1);
    return out;
  }
  const out = Buffer.alloc(5);
  out[0] = (major << 5) | 26;
  out.writeUInt32BE(length, 1);
  return out;
}

/** Enough CBOR to write what authenticators send. */
export function encodeCbor(value: CborIn): Buffer {
  if (typeof value === "number")
    return value >= 0 ? head(0, value) : head(1, -1 - value);
  if (typeof value === "boolean") return Buffer.from([value ? 0xf5 : 0xf4]);
  if (typeof value === "string") {
    const bytes = Buffer.from(value, "utf8");
    return Buffer.concat([head(3, bytes.length), bytes]);
  }
  if (Buffer.isBuffer(value))
    return Buffer.concat([head(2, value.length), value]);
  if (Array.isArray(value))
    return Buffer.concat([head(4, value.length), ...value.map(encodeCbor)]);
  const parts: Buffer[] = [head(5, value.size)];
  for (const [key, item] of value)
    parts.push(encodeCbor(key), encodeCbor(item));
  return Buffer.concat(parts);
}

const b64 = (bytes: Buffer) => bytes.toString("base64url");
const sha256 = (data: Buffer | string) =>
  createHash("sha256").update(data).digest();

export type TestAlgorithm = -7 | -8 | -257;

export interface Ceremony {
  challenge: string;
  origin: string;
  rpId: string;
}

export class FakeAuthenticator {
  readonly id = randomBytes(32);
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  counter: number;

  constructor(
    readonly algorithm: TestAlgorithm = -7,
    private readonly options: {
      verified?: boolean;
      backedUp?: boolean;
      counter?: number;
    } = {},
  ) {
    const pair =
      algorithm === -7
        ? generateKeyPairSync("ec", { namedCurve: "P-256" })
        : algorithm === -8
          ? generateKeyPairSync("ed25519")
          : generateKeyPairSync("rsa", { modulusLength: 2048 });
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey;
    this.counter = options.counter ?? 0;
  }

  /** The public key as a COSE_Key. */
  cose(): Buffer {
    const jwk = this.publicKey.export({ format: "jwk" });
    const bytes = (text: string | undefined) =>
      Buffer.from(text ?? "", "base64url");
    if (this.algorithm === -7)
      return encodeCbor(
        new Map<CborIn, CborIn>([
          [1, 2],
          [3, -7],
          [-1, 1],
          [-2, bytes(jwk.x)],
          [-3, bytes(jwk.y)],
        ]),
      );
    if (this.algorithm === -8)
      return encodeCbor(
        new Map<CborIn, CborIn>([
          [1, 1],
          [3, -8],
          [-1, 6],
          [-2, bytes(jwk.x)],
        ]),
      );
    return encodeCbor(
      new Map<CborIn, CborIn>([
        [1, 3],
        [3, -257],
        [-1, bytes(jwk.n)],
        [-2, bytes(jwk.e)],
      ]),
    );
  }

  private flags(attested: boolean): number {
    let flags = 0x01; // user present
    if (this.options.verified ?? true) flags |= 0x04;
    if (this.options.backedUp) flags |= 0x08 | 0x10;
    if (attested) flags |= 0x40;
    return flags;
  }

  authenticatorData(rpId: string, attested: boolean): Buffer {
    const count = Buffer.alloc(4);
    count.writeUInt32BE(this.counter);
    const parts: Buffer[] = [
      sha256(rpId),
      Buffer.from([this.flags(attested)]),
      count,
    ];
    if (attested) {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(this.id.length);
      parts.push(Buffer.alloc(16), length, this.id, this.cose());
    }
    return Buffer.concat(parts);
  }

  static clientData(
    type: string,
    ceremony: Ceremony,
    extra: Record<string, unknown> = {},
  ): Buffer {
    return Buffer.from(
      JSON.stringify({
        type,
        challenge: ceremony.challenge,
        origin: ceremony.origin,
        crossOrigin: false,
        ...extra,
      }),
    );
  }

  /** navigator.credentials.create()'s answer, as the client script sends it. */
  register(ceremony: Ceremony) {
    const attestationObject = encodeCbor(
      new Map<CborIn, CborIn>([
        ["fmt", "none"],
        ["attStmt", new Map()],
        ["authData", this.authenticatorData(ceremony.rpId, true)],
      ]),
    );
    return {
      id: b64(this.id),
      type: "public-key",
      response: {
        clientDataJSON: b64(
          FakeAuthenticator.clientData("webauthn.create", ceremony),
        ),
        attestationObject: b64(attestationObject),
        transports: ["internal"],
      },
    };
  }

  /** navigator.credentials.get()'s answer. Each one counts up, if this one counts. */
  assert(ceremony: Ceremony, userHandle: string | null = null) {
    if (this.counter > 0) this.counter += 1;
    const authenticatorData = this.authenticatorData(ceremony.rpId, false);
    const clientDataJSON = FakeAuthenticator.clientData(
      "webauthn.get",
      ceremony,
    );
    const signed = Buffer.concat([authenticatorData, sha256(clientDataJSON)]);
    const signature =
      this.algorithm === -7
        ? sign("sha256", signed, { key: this.privateKey, dsaEncoding: "der" })
        : this.algorithm === -8
          ? sign(null, signed, this.privateKey)
          : sign("sha256", signed, this.privateKey);
    return {
      id: b64(this.id),
      type: "public-key",
      response: {
        clientDataJSON: b64(clientDataJSON),
        authenticatorData: b64(authenticatorData),
        signature: b64(signature),
        userHandle,
      },
    };
  }
}
