import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  CHUNK_BYTES,
  describeEntropy,
  entropy,
  matchHash,
  scanFile,
} from "./scan";

describe("scanFile", () => {
  it("computes every hash", async () => {
    const { hashes } = await scanFile(new Blob(["abc"]));
    expect(hashes).toEqual({
      md5: "900150983cd24fb0d6963f7d28e17f72",
      sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
      sha256:
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      sha384:
        "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
      sha512:
        "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
      "sha3-256":
        "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532",
      blake3:
        "6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85",
      crc32: "352441c2",
    });
  });

  it("reads big files in chunks, with progress, to the same result", async () => {
    const bytes = new Uint8Array(CHUNK_BYTES * 2 + 1234);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 31) & 0xff;
    const onProgress = vi.fn();
    const { hashes, histogram } = await scanFile(new Blob([bytes]), {
      onProgress,
    });
    expect(hashes.sha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    expect(hashes.md5).toBe(createHash("md5").update(bytes).digest("hex"));
    expect(onProgress.mock.calls.map(([read]: number[]) => read)).toEqual([
      CHUNK_BYTES,
      CHUNK_BYTES * 2,
      bytes.length,
    ]);
    expect(histogram.reduce((sum, count) => sum + count, 0)).toBe(bytes.length);
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      scanFile(new Blob(["abc"]), { signal: controller.signal }),
    ).rejects.toThrow();
  });
});

describe("entropy", () => {
  it("is 0 for one repeated byte and 8 for every byte equally often", () => {
    const one = new Array<number>(256).fill(0);
    one[65] = 100;
    expect(entropy(one)).toBe(0);
    expect(entropy(new Array<number>(256).fill(4))).toBeCloseTo(8);
    expect(entropy(new Array<number>(256).fill(0))).toBe(0);
  });

  it("is described in words", () => {
    expect(describeEntropy(7.99)).toMatch(/compressed or encrypted/);
    expect(describeEntropy(4.2)).toMatch(/text/);
  });
});

describe("matchHash", () => {
  const hashes = {
    md5: "900150983cd24fb0d6963f7d28e17f72",
    sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
    sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    sha384: "x",
    sha512: "y",
    "sha3-256": "z",
    blake3: "w",
    crc32: "352441c2",
  };

  it("finds the algorithm, ignoring case, spaces and a prefix", () => {
    expect(matchHash("  900150983CD24FB0D6963F7D28E17F72 ", hashes)).toBe(
      "md5",
    );
    expect(
      matchHash(
        "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        hashes,
      ),
    ).toBe("sha256");
    expect(matchHash("352441C2", hashes)).toBe("crc32");
  });

  it("returns null for anything else", () => {
    expect(matchHash("deadbeef", hashes)).toBeNull();
    expect(matchHash("not a hash", hashes)).toBeNull();
  });
});
