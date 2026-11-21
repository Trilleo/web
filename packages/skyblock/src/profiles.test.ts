import { describe, expect, it } from "vitest";
import {
  PROFILE_LIMITS,
  cleanProfileName,
  isGameMode,
  normalizeProfileUuid,
  profileKeyPrefix,
} from "./profiles";

describe("profiles", () => {
  it("names prefixes so they fit tool-data keys", () => {
    expect(profileKeyPrefix(12)).toBe("p12-");
    expect(`${profileKeyPrefix(12)}calc-settings`).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("cleans names", () => {
    expect(cleanProfileName("  Apple   co-op ")).toBe("Apple co-op");
    expect(cleanProfileName(" ")).toBeNull();
    expect(
      cleanProfileName("x".repeat(PROFILE_LIMITS.nameLength + 1)),
    ).toBeNull();
  });

  it("reads Hypixel profile IDs with or without dashes", () => {
    expect(normalizeProfileUuid("1F2E3D4C-5B6A-7980-1A2B-3C4D5E6F7A8B")).toBe(
      "1f2e3d4c5b6a79801a2b3c4d5e6f7a8b",
    );
    expect(normalizeProfileUuid("not-a-uuid")).toBeNull();
  });

  it("knows the game modes", () => {
    expect(isGameMode("ironman")).toBe(true);
    expect(isGameMode("hardcore")).toBe(false);
  });
});
