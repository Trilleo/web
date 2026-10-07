import { openDatabase, type DatabaseHandle, type User } from "@trilleo/db";
import { LocalDriver } from "@trilleo/storage/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/sessions";
import { setStorageForTests } from "../storage/config";
import { STORAGE_PURPOSES } from "../storage/purposes";
import type { StorageDeps } from "../storage/service";
import {
  handleCreatorAction,
  ownProject,
  parseAttachRequest,
  saveProjectForm,
  saveReleaseForm,
} from "./creator";
import { summarizeVersions, formatCount } from "./format";
import { getProject } from "./store";

let handle: DatabaseHandle;
let deps: StorageDeps;
let alice: User;
let bob: User;

beforeEach(async () => {
  handle = await openDatabase("memory://");
  const storage = new LocalDriver({ root: null, baseUrl: "/s" });
  setStorageForTests(storage);
  process.env.MINECRAFT_VERSION_MANIFEST = "off";
  alice = await upsertGitHubUser(handle.db, {
    id: 2,
    login: "alice",
    name: null,
  });
  bob = await upsertGitHubUser(handle.db, { id: 3, login: "bob", name: null });
  deps = {
    db: handle.db,
    storage,
    isAdminId: () => Promise.resolve(false),
    purposes: STORAGE_PURPOSES,
  };
});

afterEach(async () => {
  setStorageForTests(undefined);
  await handle.close();
});

function form(values: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value])
      data.append(key, item);
  }
  return data;
}

const projectForm = (extra: Record<string, string> = {}) =>
  form({
    type: "world",
    name: "Sky Temple",
    summary: "A floating temple to explore.",
    edition: "java",
    license: "CC-BY-4.0",
    state: "public",
    ...extra,
  });

async function newProject() {
  const outcome = await saveProjectForm(
    handle.db,
    alice,
    false,
    null,
    projectForm(),
  );
  if (outcome.kind !== "redirect") throw new Error("not saved");
  const id = Number(/minecraft\/(\d+)\//.exec(outcome.location)?.[1]);
  const project = await getProject(handle.db, id);
  if (!project) throw new Error("gone");
  return project;
}

describe("the details form", () => {
  it("makes a project and goes to its gallery", async () => {
    const outcome = await saveProjectForm(
      handle.db,
      alice,
      false,
      null,
      projectForm(),
    );
    expect(outcome).toMatchObject({
      kind: "redirect",
      location: expect.stringMatching(
        /^\/account\/minecraft\/\d+\/gallery\/\?done=created$/,
      ) as string,
    });
  });

  it("keeps what was typed when it's refused, and puts a taken slug on its field", async () => {
    await newProject();
    const again = await saveProjectForm(
      handle.db,
      bob,
      false,
      null,
      projectForm({ summary: "" }),
    );
    expect(again).toMatchObject({
      kind: "invalid",
      values: { name: "Sky Temple" },
      errors: { summary: "Say in a line what it is." },
    });
    const taken = await saveProjectForm(
      handle.db,
      bob,
      false,
      null,
      projectForm(),
    );
    expect(taken).toMatchObject({
      kind: "invalid",
      errors: { slug: expect.stringContaining("already") as string },
    });
  });

  it("never changes a project's type", async () => {
    const project = await newProject();
    await saveProjectForm(
      handle.db,
      alice,
      false,
      project,
      projectForm({ type: "mod" }),
    );
    expect((await getProject(handle.db, project.id))?.type).toBe("world");
  });

  it("opens projects to their owner and the admin only", async () => {
    const project = await newProject();
    const id = String(project.id);
    expect(await ownProject(handle.db, alice, false, id)).not.toBeNull();
    expect(await ownProject(handle.db, bob, false, id)).toBeNull();
    expect(await ownProject(handle.db, bob, true, id)).not.toBeNull();
    expect(await ownProject(handle.db, alice, false, "nope")).toBeNull();
  });
});

describe("the release form", () => {
  it("answers JSON for the editor, and redirects otherwise", async () => {
    const project = await newProject();
    const viewer = { userId: alice.id, isAdmin: false };
    const values = form({ version: "1.0", gameVersions: ["1.21.4"] });
    expect(
      await saveReleaseForm(handle.db, viewer, project, null, values, true),
    ).toMatchObject({ kind: "json", status: 201, body: { ok: true } });
    expect(
      await saveReleaseForm(handle.db, viewer, project, null, values, true),
    ).toMatchObject({
      kind: "json",
      status: 422,
      body: { ok: false, errors: { version: expect.any(String) as string } },
    });
    expect(
      await saveReleaseForm(
        handle.db,
        viewer,
        project,
        null,
        form({ version: "2.0", gameVersions: ["1.21.4"] }),
        false,
      ),
    ).toMatchObject({
      kind: "redirect",
      location: expect.stringMatching(
        /releases\/\d+\/\?done=created$/,
      ) as string,
    });
  });
});

describe("the buttons", () => {
  it("needs the box ticked to delete a project", async () => {
    const project = await newProject();
    const requester = { user: alice, isAdmin: false };
    const unticked = await handleCreatorAction(
      deps,
      requester,
      project,
      form({ action: "delete-project" }),
    );
    expect(unticked.location).toContain("error=");
    expect(await getProject(handle.db, project.id)).toBeDefined();
    const ticked = await handleCreatorAction(
      deps,
      requester,
      project,
      form({ action: "delete-project", confirm: "yes" }),
    );
    expect(ticked.location).toBe("/account/minecraft/?done=deleted");
    expect(await getProject(handle.db, project.id)).toBeUndefined();
  });

  it("refuses unknown actions and missing things", async () => {
    const project = await newProject();
    const requester = { user: alice, isAdmin: false };
    const cases: Record<string, string>[] = [
      { action: "explode" },
      { action: "cover", image: "x" },
      { action: "primary", release: "99", file: "abcdefghijkl" },
    ];
    for (const values of cases)
      expect(
        (await handleCreatorAction(deps, requester, project, form(values)))
          .location,
      ).toContain("error=");
  });
});

describe("parseAttachRequest", () => {
  it("takes only well-formed requests", () => {
    expect(
      parseAttachRequest({
        project: 1,
        release: 2,
        file: "abcdefghijkl",
        primary: true,
      }),
    ).toEqual({ project: 1, release: 2, file: "abcdefghijkl", primary: true });
    expect(
      parseAttachRequest({ project: 1, file: "abcdefghijkl", caption: "Hi" }),
    ).toEqual({
      project: 1,
      file: "abcdefghijkl",
      caption: "Hi",
    });
    expect(
      parseAttachRequest({ project: "1", file: "abcdefghijkl" }),
    ).toBeNull();
    expect(parseAttachRequest({ project: 1, file: "../etc" })).toBeNull();
    expect(parseAttachRequest(null)).toBeNull();
  });
});

describe("format", () => {
  it("summarizes versions", () => {
    expect(summarizeVersions([])).toBe("No versions");
    expect(summarizeVersions(["1.21.4"])).toBe("1.21.4");
    expect(summarizeVersions(["1.21.4", "1.21.3", "1.21"])).toBe("1.21–1.21.4");
    expect(summarizeVersions(["1.20.1", "1.21.4"])).toBe("1.20.1, 1.21.4");
    expect(summarizeVersions(["1.19.4", "1.20.1", "1.21.4", "26.1"])).toBe(
      "1.19.4–26.1",
    );
  });

  it("shortens counts", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1200)).toBe("1.2k");
    expect(formatCount(45_000)).toBe("45k");
    expect(formatCount(2_500_000)).toBe("2.5M");
  });
});
