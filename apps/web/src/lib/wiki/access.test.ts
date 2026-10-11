import { describe, expect, it } from "vitest";
import { canEditPage, wikiAccess } from "./access";

const as = (
  visibility: "public" | "unlisted" | "private",
  role: "owner" | "editor" | null,
  admin = false,
) =>
  wikiAccess({ visibility }, { signedIn: role !== null || admin, role, admin });

describe("wikiAccess", () => {
  it("lets anyone read public and unlisted wikis, and only members private ones", () => {
    expect(as("public", null).read).toBe(true);
    expect(as("unlisted", null).read).toBe(true);
    expect(as("private", null).read).toBe(false);
    expect(as("private", "editor").read).toBe(true);
    expect(as("private", null, true).read).toBe(true);
  });

  it("gives editors pages and owners the wiki", () => {
    expect(as("public", null)).toMatchObject({ edit: false, manage: false });
    expect(as("public", "editor")).toMatchObject({ edit: true, manage: false });
    expect(as("public", "owner")).toMatchObject({ edit: true, manage: true });
    expect(as("public", null, true)).toMatchObject({
      edit: true,
      manage: true,
    });
  });

  it("keeps protected pages for owners", () => {
    const page = { protection: "owners" as const };
    expect(canEditPage(as("public", "editor"), page)).toBe(false);
    expect(canEditPage(as("public", "owner"), page)).toBe(true);
    expect(canEditPage(as("public", "editor"), { protection: "none" })).toBe(
      true,
    );
    expect(canEditPage(as("public", "editor"), null)).toBe(true);
  });
});
