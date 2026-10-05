import { describe, expect, it } from "vitest";
import {
  earnsTrust,
  isTrustedUploader,
  reporterCounts,
  reportsHide,
  strikeExpiry,
  strikesBan,
  type UploaderStanding,
} from "./policy";
import { transition } from "./moderation";

const fresh: UploaderStanding = {
  trust: "auto",
  trustedAt: null,
  activeStrikes: 0,
  bannedAt: null,
};
const day = new Date("2026-10-05T00:00:00Z");

describe("trust", () => {
  it("is earned by approvals, and lost to strikes and bans", () => {
    expect(isTrustedUploader(fresh)).toBe(false);
    expect(earnsTrust(fresh, 2)).toBe(false);
    expect(earnsTrust(fresh, 3)).toBe(true);
    const earned = { ...fresh, trustedAt: day };
    expect(isTrustedUploader(earned)).toBe(true);
    expect(isTrustedUploader({ ...earned, activeStrikes: 1 })).toBe(false);
    expect(isTrustedUploader({ ...earned, bannedAt: day })).toBe(false);
    expect(earnsTrust({ ...fresh, activeStrikes: 1 }, 10)).toBe(false);
  });

  it("follows the admin's choice over history", () => {
    expect(isTrustedUploader({ ...fresh, trust: "trusted" })).toBe(true);
    expect(
      isTrustedUploader({ ...fresh, trust: "untrusted", trustedAt: day }),
    ).toBe(false);
    expect(earnsTrust({ ...fresh, trust: "untrusted" }, 10)).toBe(false);
    // Even forced trust doesn't survive a ban.
    expect(
      isTrustedUploader({ ...fresh, trust: "trusted", bannedAt: day }),
    ).toBe(false);
  });
});

describe("strikes and reports", () => {
  it("bans at three strikes, which last 90 days", () => {
    expect(strikesBan(2)).toBe(false);
    expect(strikesBan(3)).toBe(true);
    expect(strikeExpiry(day).toISOString()).toBe("2027-01-03T00:00:00.000Z");
  });

  it("counts reporters a week old, and hides at three", () => {
    const now = new Date("2026-10-12T00:00:00Z");
    expect(reporterCounts(day, now)).toBe(true);
    expect(reporterCounts(new Date("2026-10-06T00:00:00Z"), now)).toBe(false);
    expect(reportsHide(2)).toBe(false);
    expect(reportsHide(3)).toBe(true);
  });

  it("hides a published file only, with a reason", () => {
    expect(
      transition("published", "flag", "system", { reason: "Reported" }),
    ).toEqual({
      ok: true,
      to: "pending_review",
    });
    expect(transition("published", "flag", "admin", { reason: "x" }).ok).toBe(
      false,
    );
    expect(
      transition("pending_review", "flag", "system", { reason: "x" }).ok,
    ).toBe(false);
    expect(transition("published", "flag", "system")).toEqual({
      ok: false,
      error: "needs-reason",
    });
  });
});
