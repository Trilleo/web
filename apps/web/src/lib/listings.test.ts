import { describe, expect, it } from "vitest";
import { formatListingNumber, formatPostDate } from "./listings";

describe("formatListingNumber", () => {
  it("is 1-based and zero-padded to three digits by default", () => {
    expect(formatListingNumber(0)).toBe("001");
    expect(formatListingNumber(41)).toBe("042");
  });

  it("supports other widths and doesn't truncate", () => {
    expect(formatListingNumber(0, 2)).toBe("01");
    expect(formatListingNumber(999)).toBe("1000");
  });
});

describe("formatPostDate", () => {
  it("formats in UTC as YYYY.MM.DD", () => {
    expect(formatPostDate(new Date("2026-09-28T23:30:00Z"))).toBe("2026.09.28");
    expect(formatPostDate(new Date("2026-01-05T00:00:00Z"))).toBe("2026.01.05");
  });

  it("shows a dash for undated posts", () => {
    expect(formatPostDate(null)).toBe("—");
  });
});
