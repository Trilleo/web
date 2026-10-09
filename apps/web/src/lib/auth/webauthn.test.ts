import { describe, expect, it } from "vitest";
import {
  WebAuthnError,
  coseToKey,
  decodeCbor,
  fromBase64Url,
  parseAuthenticatorData,
  verifyAssertion,
  verifyRegistration,
} from "./webauthn";
import { FakeAuthenticator, encodeCbor } from "./webauthn-testing";

const ceremony = {
  challenge: "the-challenge-0123456789abcdef",
  origin: "https://www.trilleo.net",
  rpId: "www.trilleo.net",
};

function registered(authenticator: FakeAuthenticator) {
  const answer = authenticator.register(ceremony);
  return verifyRegistration({
    clientDataJSON: fromBase64Url(answer.response.clientDataJSON),
    attestationObject: fromBase64Url(answer.response.attestationObject),
    expected: ceremony,
  });
}

function signIn(
  authenticator: FakeAuthenticator,
  stored: { publicKey: string; signCount: number },
  expected = ceremony,
  asserted = ceremony,
) {
  const answer = authenticator.assert(asserted);
  return verifyAssertion({
    clientDataJSON: fromBase64Url(answer.response.clientDataJSON),
    authenticatorData: fromBase64Url(answer.response.authenticatorData),
    signature: fromBase64Url(answer.response.signature),
    expected,
    ...stored,
  });
}

describe("CBOR", () => {
  it("reads what authenticators write", () => {
    const value = new Map<unknown, unknown>([
      [1, 2],
      [-7, "text"],
      ["bytes", Buffer.from([1, 2, 3])],
      ["list", [true, false, 300, 70000]],
    ]);
    expect(decodeCbor(encodeCbor(value as never))).toEqual(value);
  });

  it("refuses truncated, trailing and too-deep input", () => {
    const bytes = encodeCbor("hello");
    expect(() => decodeCbor(bytes.subarray(0, 3))).toThrow(WebAuthnError);
    expect(() => decodeCbor(Buffer.concat([bytes, Buffer.from([0])]))).toThrow(
      WebAuthnError,
    );
    const deep = Buffer.from([...Array<number>(40).fill(0x81), 0x00]);
    expect(() => decodeCbor(deep)).toThrow(/deeply/);
  });
});

describe.each([
  { algorithm: -7, name: "ES256" },
  { algorithm: -8, name: "EdDSA" },
  { algorithm: -257, name: "RS256" },
] as const)("$name passkeys", ({ algorithm }) => {
  it("register, then sign in", () => {
    const authenticator = new FakeAuthenticator(algorithm);
    const credential = registered(authenticator);
    expect(credential).toMatchObject({
      id: authenticator.id.toString("base64url"),
      algorithm,
      signCount: 0,
      backedUp: false,
    });
    expect(coseToKey(fromBase64Url(credential.publicKey)).algorithm).toBe(
      algorithm,
    );
    expect(signIn(authenticator, credential)).toEqual({
      signCount: 0,
      backedUp: false,
    });
  });
});

describe("verifyRegistration", () => {
  it("refuses another challenge, origin or site", () => {
    const authenticator = new FakeAuthenticator();
    const answer = authenticator.register(ceremony);
    const check = (expected: typeof ceremony) =>
      verifyRegistration({
        clientDataJSON: fromBase64Url(answer.response.clientDataJSON),
        attestationObject: fromBase64Url(answer.response.attestationObject),
        expected,
      });
    expect(() => check({ ...ceremony, challenge: "another" })).toThrow(
      /challenge/,
    );
    expect(() =>
      check({ ...ceremony, origin: "https://evil.example" }),
    ).toThrow(/origin/);
    expect(() => check({ ...ceremony, rpId: "evil.example" })).toThrow(/RP ID/);
  });

  it("insists the device checked it was them", () => {
    expect(() =>
      registered(new FakeAuthenticator(-7, { verified: false })),
    ).toThrow(/verified/);
  });

  it("records synced passkeys", () => {
    expect(
      registered(new FakeAuthenticator(-7, { backedUp: true })).backedUp,
    ).toBe(true);
  });
});

describe("verifyAssertion", () => {
  it("refuses another key's signature", () => {
    const mine = new FakeAuthenticator();
    const theirs = new FakeAuthenticator();
    const stored = registered(mine);
    expect(() => signIn(theirs, stored)).toThrow(/signature/);
  });

  it("refuses a replayed challenge or another ceremony type", () => {
    const authenticator = new FakeAuthenticator();
    const stored = registered(authenticator);
    expect(() =>
      signIn(authenticator, stored, ceremony, {
        ...ceremony,
        challenge: "old-challenge",
      }),
    ).toThrow(/challenge/);
    const answer = authenticator.register(ceremony);
    expect(() =>
      verifyAssertion({
        clientDataJSON: fromBase64Url(answer.response.clientDataJSON),
        authenticatorData: authenticator.authenticatorData(
          ceremony.rpId,
          false,
        ),
        signature: Buffer.alloc(64),
        expected: ceremony,
        ...stored,
      }),
    ).toThrow(/type/);
  });

  it("follows the counter, and refuses one that went backwards (a clone)", () => {
    const authenticator = new FakeAuthenticator(-7, { counter: 5 });
    const stored = registered(authenticator);
    expect(stored.signCount).toBe(5);
    const first = signIn(authenticator, stored);
    expect(first.signCount).toBe(6);
    expect(() => signIn(authenticator, { ...stored, signCount: 10 })).toThrow(
      /Counter/,
    );
  });

  it("reads the flags and counter of authenticator data", () => {
    const authenticator = new FakeAuthenticator(-7, {
      backedUp: true,
      counter: 3,
    });
    const data = parseAuthenticatorData(
      authenticator.authenticatorData(ceremony.rpId, true),
    );
    expect(data.flags).toEqual({ up: true, uv: true, be: true, bs: true });
    expect(data.signCount).toBe(3);
    expect(data.credential?.id).toEqual(authenticator.id);
  });
});
