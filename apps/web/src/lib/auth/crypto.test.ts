import { describe, expect, it } from "vitest";
import { codeChallenge, hashToken, randomToken } from "./crypto";

describe("randomToken", () => {
  it("makes 256-bit URL-safe tokens that don't repeat", () => {
    const tokens = new Set(Array.from({ length: 100 }, randomToken));
    expect(tokens.size).toBe(100);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe("hashToken", () => {
  it("is a stable SHA-256 hex digest", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abd")).not.toBe(hashToken("abc"));
  });
});

describe("codeChallenge", () => {
  it("matches RFC 7636's worked example", () => {
    expect(codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});
