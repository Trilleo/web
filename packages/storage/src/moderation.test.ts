import { describe, expect, it } from "vitest";
import {
  needsReview,
  planParts,
  partRange,
  type StoragePurpose,
} from "./limits";
import {
  FILE_STATUSES,
  availableActions,
  isServedPublicly,
  purgeAfter,
  transition,
} from "./moderation";

describe("transition", () => {
  it("walks an upload to published or review", () => {
    expect(transition("uploading", "complete", "owner")).toEqual({
      ok: true,
      to: "processing",
    });
    expect(
      transition("processing", "processed", "system", { needsReview: false }),
    ).toEqual({ ok: true, to: "published" });
    expect(
      transition("processing", "processed", "system", { needsReview: true }),
    ).toEqual({ ok: true, to: "pending_review" });
    expect(transition("pending_review", "approve", "admin")).toEqual({
      ok: true,
      to: "published",
    });
  });

  it("keeps moderation to the admin", () => {
    for (const action of ["approve", "reject", "remove", "restore"] as const) {
      expect(transition("pending_review", action, "owner")).toEqual({
        ok: false,
        error: "not-allowed",
      });
    }
    expect(transition("processing", "processed", "admin").ok).toBe(false);
  });

  it("needs a reason to reject, remove or fail", () => {
    expect(transition("pending_review", "reject", "admin")).toEqual({
      ok: false,
      error: "needs-reason",
    });
    expect(
      transition("published", "remove", "admin", { reason: "  " }).ok,
    ).toBe(false);
    expect(
      transition("published", "remove", "admin", { reason: "Copyright" }),
    ).toEqual({ ok: true, to: "removed" });
  });

  it("refuses actions from the wrong status", () => {
    expect(transition("published", "approve", "admin")).toEqual({
      ok: false,
      error: "wrong-status",
    });
    // A removed file stays removed until the admin restores it.
    expect(transition("removed", "delete", "owner")).toEqual({
      ok: false,
      error: "wrong-status",
    });
    expect(transition("deleted", "delete", "admin").ok).toBe(false);
  });

  it("lists what each actor can do", () => {
    expect(availableActions("published", "owner")).toEqual(["delete"]);
    expect(availableActions("pending_review", "admin")).toEqual([
      "approve",
      "reject",
      "remove",
      "delete",
    ]);
    expect(availableActions("removed", "admin")).toEqual(["restore"]);
    for (const status of FILE_STATUSES)
      expect(availableActions(status, "system")).not.toContain("approve");
  });
});

describe("serving and retention", () => {
  it("serves only published, non-private files", () => {
    expect(isServedPublicly("published", "public")).toBe(true);
    expect(isServedPublicly("published", "unlisted")).toBe(true);
    expect(isServedPublicly("published", "private")).toBe(false);
    expect(isServedPublicly("pending_review", "public")).toBe(false);
  });

  it("purges after the retention period", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    expect(purgeAfter("deleted", since)?.toISOString()).toBe(
      "2026-01-08T00:00:00.000Z",
    );
    expect(purgeAfter("removed", since)?.toISOString()).toBe(
      "2026-01-31T00:00:00.000Z",
    );
    expect(purgeAfter("published", since)).toBeNull();
  });
});

describe("needsReview", () => {
  const purpose: StoragePurpose = {
    slug: "creator",
    label: "Creations",
    uploaders: "users",
    visibilities: ["public", "private"],
    defaultVisibility: "public",
    review: "untrusted",
  };

  it("reviews untrusted uploaders' public files", () => {
    expect(needsReview(purpose, "user", "public")).toBe(true);
    expect(needsReview(purpose, "trusted", "public")).toBe(false);
    expect(needsReview(purpose, "admin", "public")).toBe(false);
    expect(needsReview(purpose, "user", "private")).toBe(false);
    expect(
      needsReview({ ...purpose, review: "always" }, "trusted", "unlisted"),
    ).toBe(true);
  });
});

describe("planParts", () => {
  const MiB = 1024 * 1024;

  it("sends small files in one part", () => {
    expect(planParts(0)).toEqual({ partSize: 1, partCount: 1 });
    expect(planParts(5 * MiB)).toEqual({ partSize: 5 * MiB, partCount: 1 });
    expect(planParts(16 * MiB).partCount).toBe(1);
  });

  it("cuts big files into 8 MiB parts", () => {
    const size = 1024 * MiB;
    const plan = planParts(size);
    expect(plan).toEqual({ partSize: 8 * MiB, partCount: 128 });
    expect(partRange(plan, size, 128)).toEqual({
      start: 127 * 8 * MiB,
      end: size,
    });
  });

  it("covers every byte exactly once", () => {
    const size = 20 * MiB + 3;
    const plan = planParts(size);
    let covered = 0;
    for (let n = 1; n <= plan.partCount; n++) {
      const { start, end } = partRange(plan, size, n);
      expect(start).toBe(covered);
      covered = end;
    }
    expect(covered).toBe(size);
  });
});
