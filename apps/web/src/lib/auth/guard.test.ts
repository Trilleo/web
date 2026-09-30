import type { User } from "@trilleo/db";
import { describe, expect, it } from "vitest";
import { isAdmin, requireAdmin, requireUser } from "./guard";
import { TEST_CONFIG } from "./testing";

function user(githubId: number): User {
  const date = new Date("2026-01-01T00:00:00Z");
  return {
    id: "00000000-0000-4000-8000-000000000001",
    githubId,
    githubLogin: "someone",
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

  it("lets nobody through while sign-in isn't set up", () => {
    const response = requireAdmin(context(user(1001)), null);
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
  it("goes by GitHub ID", () => {
    expect(isAdmin(user(1001), TEST_CONFIG)).toBe(true);
    expect(isAdmin(user(2002), TEST_CONFIG)).toBe(false);
    expect(isAdmin(null, TEST_CONFIG)).toBe(false);
    expect(isAdmin(user(1001), null)).toBe(false);
  });
});
