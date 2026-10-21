import { describe, expect, it } from "vitest";
import { isImageName, mayMessage, validVote, validatePoll } from "./index";

const now = new Date("2026-03-01T12:00:00Z");
const draft = {
  question: "Which block is best?",
  options: "Stone\nDirt\n\nStone\nGlass",
  multiple: false,
  maxChoices: "",
  length: "7d",
  resultsBeforeVote: false,
};

describe("polls", () => {
  it("reads a poll as typed, dropping blank and repeated options", () => {
    const result = validatePoll(draft, now);
    expect(result).toEqual({
      ok: true,
      poll: {
        question: "Which block is best?",
        options: ["Stone", "Dirt", "Glass"],
        multiple: false,
        maxChoices: null,
        closesAt: new Date("2026-03-08T12:00:00Z"),
        resultsBeforeVote: false,
      },
    });
  });

  it("treats an empty poll as none, and says what's wrong otherwise", () => {
    expect(validatePoll({ ...draft, question: "", options: " " }, now)).toEqual(
      { ok: true, poll: null },
    );
    const bad = validatePoll(
      { ...draft, options: "Only one", multiple: true, maxChoices: "5" },
      now,
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok)
      expect(Object.keys(bad.errors).sort()).toEqual(["maxChoices", "options"]);
    expect(validatePoll({ ...draft, question: "" }, now).ok).toBe(false);
  });

  it("checks votes against the poll's rules", () => {
    const single = { multiple: false, maxChoices: null };
    const two = { multiple: true, maxChoices: 2 };
    expect(validVote(single, [1], [1, 2, 3])).toBe(true);
    expect(validVote(single, [1, 2], [1, 2, 3])).toBe(false);
    expect(validVote(single, [], [1, 2, 3])).toBe(false);
    expect(validVote(single, [9], [1, 2, 3])).toBe(false);
    expect(validVote(two, [1, 2], [1, 2, 3])).toBe(true);
    expect(validVote(two, [1, 2, 3], [1, 2, 3])).toBe(false);
    expect(validVote(two, [1, 1], [1, 2, 3])).toBe(false);
  });
});

describe("attachments", () => {
  it("tells pictures from other files", () => {
    expect(isImageName("Shot.PNG")).toBe(true);
    expect(isImageName("build.litematic")).toBe(false);
  });
});

describe("messages", () => {
  const base = {
    staff: false,
    privacy: "everyone" as const,
    talkedBefore: false,
    blocked: false,
  };
  it("follows people's settings and blocks, except for staff", () => {
    expect(mayMessage(base)).toBe(true);
    expect(mayMessage({ ...base, privacy: "contacts" })).toBe(false);
    expect(
      mayMessage({ ...base, privacy: "contacts", talkedBefore: true }),
    ).toBe(true);
    expect(mayMessage({ ...base, privacy: "nobody", talkedBefore: true })).toBe(
      false,
    );
    expect(mayMessage({ ...base, blocked: true })).toBe(false);
    expect(
      mayMessage({ ...base, staff: true, privacy: "nobody", blocked: true }),
    ).toBe(true);
  });
});
