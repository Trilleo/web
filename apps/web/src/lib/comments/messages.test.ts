import { describe, expect, it } from "vitest";
import { commentErrorMessage, commentErrorStatus } from "./messages";
import type { CreateError } from "./store";

const ERRORS: CreateError[] = [
  "empty",
  "too-long",
  "blocked",
  "no-parent",
  "rate-limited",
  "too-many-pending",
];

describe("commentErrorMessage", () => {
  it("explains every refusal", () => {
    for (const error of ERRORS) {
      expect(commentErrorMessage(error)).toMatch(/\w+.*\.$/);
    }
  });

  it("says how long the comment was", () => {
    expect(commentErrorMessage("too-long", 4321)).toBe(
      "Comments can be up to 4,000 characters; yours has 4,321.",
    );
  });
});

describe("commentErrorStatus", () => {
  it("uses 429 for limits, 403 for blocked accounts, 422 for the rest", () => {
    expect(commentErrorStatus("rate-limited")).toBe(429);
    expect(commentErrorStatus("too-many-pending")).toBe(429);
    expect(commentErrorStatus("blocked")).toBe(403);
    expect(commentErrorStatus("empty")).toBe(422);
    expect(commentErrorStatus("no-parent")).toBe(422);
  });
});
