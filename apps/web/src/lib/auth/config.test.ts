import { describe, expect, it } from "vitest";
import { parseAdminEmails, parseAdminIds, readAuthConfig } from "./config";

const complete = {
  GITHUB_CLIENT_ID: "client",
  GITHUB_CLIENT_SECRET: "secret",
  ADMIN_GITHUB_IDS: "1001",
  ADMIN_EMAILS: "Owner@Example.com",
};

describe("parseAdminIds", () => {
  it("reads comma-separated numeric IDs, ignoring spaces and blanks", () => {
    expect([...parseAdminIds(" 1001, 2002 ,,")]).toEqual([1001, 2002]);
    expect(parseAdminIds(undefined).size).toBe(0);
    expect(parseAdminIds("").size).toBe(0);
  });

  it("rejects usernames and other non-IDs loudly", () => {
    expect(() => parseAdminIds("octocat")).toThrow(/numeric GitHub user ID/);
    expect(() => parseAdminIds("12.5")).toThrow();
    expect(() => parseAdminIds("-4")).toThrow();
    expect(() => parseAdminIds("99999999999999999999")).toThrow();
  });
});

describe("parseAdminEmails", () => {
  it("reads comma-separated addresses, lower-cased", () => {
    expect([...parseAdminEmails(" A@Example.com, b@example.org,,")]).toEqual([
      "a@example.com",
      "b@example.org",
    ]);
    expect(parseAdminEmails(undefined).size).toBe(0);
  });

  it("rejects anything that isn't an address loudly", () => {
    expect(() => parseAdminEmails("octocat")).toThrow(/ADMIN_EMAILS/);
  });
});

describe("readAuthConfig", () => {
  it("returns the settings, with GitHub's real URLs by default", () => {
    expect(readAuthConfig(complete)).toEqual({
      github: {
        clientId: "client",
        clientSecret: "secret",
        githubWebUrl: "https://github.com",
        githubApiUrl: "https://api.github.com",
      },
      adminEmails: new Set(["owner@example.com"]),
      adminGithubIds: new Set([1001]),
    });
  });

  it("accepts other GitHub URLs (for the e2e fake), without trailing slashes", () => {
    const config = readAuthConfig({
      ...complete,
      GITHUB_WEB_URL: "http://127.0.0.1:4330/",
      GITHUB_API_URL: "http://127.0.0.1:4330",
    });
    expect(config.github?.githubWebUrl).toBe("http://127.0.0.1:4330");
    expect(config.github?.githubApiUrl).toBe("http://127.0.0.1:4330");
  });

  it("leaves GitHub out until both of its credentials are there", () => {
    expect(readAuthConfig({}).github).toBeNull();
    expect(
      readAuthConfig({ ...complete, GITHUB_CLIENT_ID: " " }).github,
    ).toBeNull();
    expect(
      readAuthConfig({ ...complete, GITHUB_CLIENT_SECRET: "" }).github,
    ).toBeNull();
    // Without admins, sign-in still works; nobody can use /admin.
    expect(
      readAuthConfig({ GITHUB_CLIENT_ID: "c", GITHUB_CLIENT_SECRET: "s" })
        .github,
    ).not.toBeNull();
  });
});
