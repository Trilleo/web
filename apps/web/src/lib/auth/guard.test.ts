import type { User } from "@trilleo/db";
import { describe, expect, it } from "vitest";
import { isAdmin, requireAdmin, requireUser } from "./guard";
import { TEST_CONFIG } from "./testing";

function user(githubId: number | null, email: string | null = null): User {
  const date = new Date("2026-01-01T00:00:00Z");
  return {
    id: "00000000-0000-4000-8000-000000000001",
    githubId,
    githubLogin: "someone",
    username: "someone",
    usernameChangedAt: null,
    name: null,
    displayName: null,
    bio: null,
    pronouns: null,
    location: null,
    status: null,
    links: [],
    profilePublic: true,
    commentName: "display",
    profileUpdatedAt: null,
    createdAt: date,
    lastSignInAt: date,
    trustedAt: null,
    blockedAt: null,
    storageQuotaBytes: null,
    uploadTrust: "auto",
    uploadTrustedAt: null,
    uploadBannedAt: null,
    uploadBanReason: null,
    email,
    emailVerifiedAt: null,
    emailNotifications: {},
    emailToken: null,
  };
}

function context(signedIn: User | null) {
  return {
    locals: { user: signedIn, session: null },
    url: new URL("https://www.trilleo.net/admin?tab=1"),
  };
}

describe("requireAdmin", () => {
  it("sends visitors who aren't signed in to sign in, then back", () => {
    const response = requireAdmin(context(null), TEST_CONFIG);
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) return;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/sign-in?next=%2Fadmin%3Ftab%3D1",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("forbids signed-in users who aren't admins", () => {
    const response = requireAdmin(context(user(2002)), TEST_CONFIG);
    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) expect(response.status).toBe(403);
  });

  it("lets admins through", () => {
    const admin = user(1001);
    expect(requireAdmin(context(admin), TEST_CONFIG)).toBe(admin);
  });

  it("lets nobody through when no admin is configured", () => {
    const none = {
      github: null,
      adminEmails: new Set<string>(),
      adminGithubIds: new Set<number>(),
    };
    const response = requireAdmin(
      context(user(1001, "owner@example.com")),
      none,
    );
    expect(response).toBeInstanceOf(Response);
  });
});

describe("requireUser", () => {
  it("sends visitors who aren't signed in to sign in, then back", () => {
    const response = requireUser(context(null));
    expect(response).toBeInstanceOf(Response);
    if (response instanceof Response) {
      expect(response.headers.get("Location")).toBe(
        "/sign-in?next=%2Fadmin%3Ftab%3D1",
      );
    }
  });

  it("lets anyone signed in through", () => {
    const visitor = user(2002);
    expect(requireUser(context(visitor))).toBe(visitor);
  });
});

describe("isAdmin", () => {
  it("goes by the linked GitHub account's ID", () => {
    expect(isAdmin(user(1001), TEST_CONFIG)).toBe(true);
    expect(isAdmin(user(2002), TEST_CONFIG)).toBe(false);
    expect(isAdmin(null, TEST_CONFIG)).toBe(false);
  });

  it("or by the account's (proved) address", () => {
    expect(isAdmin(user(null, "owner@example.com"), TEST_CONFIG)).toBe(true);
    expect(isAdmin(user(null, "someone@example.com"), TEST_CONFIG)).toBe(false);
    expect(isAdmin(user(null), TEST_CONFIG)).toBe(false);
  });
});
