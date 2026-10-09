import type { User } from "@trilleo/db";
import { describe, expect, it } from "vitest";
import {
  PROFILE_LIMITS,
  cleanLine,
  cleanText,
  commentName,
  displayName,
  linkHost,
  monogram,
  normalizeLink,
  profileDraft,
  profileHref,
  readProfileForm,
  validateProfile,
  type ProfileDraft,
} from "./profile";

const empty: ProfileDraft = {
  displayName: "",
  pronouns: "",
  location: "",
  status: "",
  bio: "",
  links: [],
  profilePublic: true,
  commentName: "display",
};

const draft = (changes: Partial<ProfileDraft>): ProfileDraft => ({
  ...empty,
  ...changes,
});

const person = (changes: Partial<User> = {}) =>
  ({
    username: "octo-cat",
    name: null,
    displayName: null,
    commentName: "display",
    ...changes,
  }) as User;

describe("cleanLine / cleanText", () => {
  it("removes control and bidi characters and collapses space", () => {
    expect(cleanLine("  Ada\u202E \t Love\u0000lace  ")).toBe("Ada Love lace");
    expect(cleanLine("a\nb")).toBe("a b");
  });

  it("keeps paragraphs in text, but not runs of blank lines", () => {
    expect(cleanText("Hi\r\n\r\n\r\n\r\nthere  \n\u202Eok\u0007")).toBe(
      "Hi\n\nthere\nok",
    );
  });
});

describe("normalizeLink", () => {
  it("accepts web addresses, adding https:// to bare hosts", () => {
    expect(normalizeLink("https://example.com/me")).toBe(
      "https://example.com/me",
    );
    expect(normalizeLink("http://example.com")).toBe("http://example.com/");
    expect(normalizeLink("example.com/me")).toBe("https://example.com/me");
    expect(normalizeLink("  www.Example.com ")).toBe(
      "https://www.example.com/",
    );
  });

  it("refuses everything else", () => {
    for (const bad of [
      "",
      "javascript:alert(1)",
      "data:text/html,hi",
      "mailto:a@example.com",
      "ftp://example.com",
      "https://user:pass@example.com",
      "https://localhost",
      "not a link",
      "foo",
    ]) {
      expect(normalizeLink(bad), bad).toBeNull();
    }
  });

  it("labels links by host", () => {
    expect(linkHost("https://www.github.com/x")).toBe("github.com");
  });
});

describe("validateProfile", () => {
  it("tidies fields, turning empty ones into null", () => {
    const result = validateProfile(
      draft({
        displayName: "  Ada   Lovelace ",
        pronouns: "she/her",
        bio: "  Hello\n\n\n\nworld ",
        links: [
          { label: "", url: "example.com" },
          { label: "", url: "" },
          { label: "My blog", url: "https://blog.example.org/" },
        ],
        commentName: "username",
        profilePublic: false,
      }),
    );
    expect(result).toEqual({
      ok: true,
      profile: {
        displayName: "Ada Lovelace",
        pronouns: "she/her",
        location: null,
        status: null,
        bio: "Hello\n\nworld",
        links: [
          { label: "example.com", url: "https://example.com/" },
          { label: "My blog", url: "https://blog.example.org/" },
        ],
        profilePublic: false,
        commentName: "username",
      },
    });
  });

  it("counts characters as people do", () => {
    const ok = validateProfile(
      draft({ displayName: "🙂".repeat(PROFILE_LIMITS.displayName) }),
    );
    expect(ok.ok).toBe(true);
    const long = validateProfile(
      draft({ displayName: "a".repeat(PROFILE_LIMITS.displayName + 1) }),
    );
    expect(long).toEqual({
      ok: false,
      errors: { displayName: expect.stringContaining("50") as string },
    });
  });

  it("reports each problem against its field", () => {
    const result = validateProfile(
      draft({
        bio: "x".repeat(PROFILE_LIMITS.bio + 1),
        status: "s".repeat(PROFILE_LIMITS.status + 1),
        links: [
          { label: "Bad", url: "javascript:alert(1)" },
          { label: "No address", url: "" },
          { label: "l".repeat(PROFILE_LIMITS.linkLabel + 1), url: "a.com" },
          { label: "", url: `https://a.com/${"p".repeat(300)}` },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      "bio",
      "link-0",
      "link-1",
      "link-2",
      "link-3",
      "status",
    ]);
  });

  it("ignores link rows past the limit", () => {
    const links = Array.from({ length: 8 }, (_, index) => ({
      label: "",
      url: `https://example.com/${String(index)}`,
    }));
    const result = validateProfile(draft({ links }));
    expect(result.ok && result.profile.links).toHaveLength(
      PROFILE_LIMITS.links,
    );
  });
});

describe("readProfileForm / profileDraft", () => {
  it("reads the form's fields and link rows", () => {
    const form = new FormData();
    form.set("displayName", "Ada");
    form.set("link-label-1", "Site");
    form.set("link-url-1", "example.com");
    form.set("profilePublic", "on");
    form.set("commentName", "username");
    const read = readProfileForm(form);
    expect(read).toMatchObject({
      displayName: "Ada",
      pronouns: "",
      profilePublic: true,
      commentName: "username",
    });
    expect(read.links).toHaveLength(PROFILE_LIMITS.links);
    expect(read.links[1]).toEqual({ label: "Site", url: "example.com" });
  });

  it("treats a missing checkbox as private, and unknown names as display", () => {
    const form = new FormData();
    form.set("commentName", "admin");
    expect(readProfileForm(form)).toMatchObject({
      profilePublic: false,
      commentName: "display",
    });
  });

  it("fills a saved profile's form, with empty link rows to add more", () => {
    const user = person({
      displayName: "Ada",
      links: [{ label: "Site", url: "https://example.com/" }],
      profilePublic: true,
    });
    const form = profileDraft(user);
    expect(form.displayName).toBe("Ada");
    expect(form.bio).toBe("");
    expect(form.links).toHaveLength(PROFILE_LIMITS.links);
    expect(form.links[0]).toEqual({
      label: "Site",
      url: "https://example.com/",
    });
  });
});

describe("names", () => {
  it("prefers the chosen name, then GitHub's, then the username", () => {
    expect(displayName(person())).toBe("octo-cat");
    expect(displayName(person({ name: "Octo Cat" }))).toBe("Octo Cat");
    expect(displayName(person({ name: "Octo Cat", displayName: "Oc" }))).toBe(
      "Oc",
    );
  });

  it("signs comments with the display name, unless they chose @username", () => {
    expect(commentName(person({ name: "Octo" }))).toBe("Octo");
    expect(
      commentName(person({ name: "Octo", commentName: "username" })),
    ).toBeNull();
  });

  it("makes monograms from initials", () => {
    expect(monogram(person())).toBe("OC");
    expect(monogram(person({ displayName: "ada lovelace byron" }))).toBe("AL");
    expect(monogram(person({ displayName: "Zoë" }))).toBe("Z");
    expect(monogram(person({ displayName: "张三" }))).toBe("张");
    expect(monogram(person({ displayName: "🙂 ✨" }))).toBe("O");
  });

  it("links to the public page", () => {
    expect(profileHref("octo-cat")).toBe("/people/octo-cat/");
  });
});
