import { describe, expect, it } from "vitest";
import { parseAdminIds, readAuthConfig } from "./config";

const complete = {
  GITHUB_CLIENT_ID: "client",
  GITHUB_CLIENT_SECRET: "secret",
  ADMIN_GITHUB_IDS: "1001",
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

describe("readAuthConfig", () => {
  it("returns the settings, with GitHub's real URLs by default", () => {
    expect(readAuthConfig(complete)).toEqual({
      clientId: "client",
      clientSecret: "secret",
      adminIds: new Set([1001]),
      githubWebUrl: "https://github.com",
      githubApiUrl: "https://api.github.com",
    });
  });

  it("accepts other GitHub URLs (for the e2e fake), without trailing slashes", () => {
    const config = readAuthConfig({
      ...complete,
      GITHUB_WEB_URL: "http://127.0.0.1:4330/",
      GITHUB_API_URL: "http://127.0.0.1:4330",
    });
    expect(config?.githubWebUrl).toBe("http://127.0.0.1:4330");
    expect(config?.githubApiUrl).toBe("http://127.0.0.1:4330");
  });

  it("is null until every required setting is present", () => {
    expect(readAuthConfig({})).toBeNull();
    for (const key of Object.keys(complete)) {
      expect(readAuthConfig({ ...complete, [key]: "  " })).toBeNull();
    }
  });
});
