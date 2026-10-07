import {
  files,
  openDatabase,
  users,
  type DatabaseHandle,
  type McProject,
  type McRelease,
} from "@trilleo/db";
import { LocalDriver } from "@trilleo/storage/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/sessions";
import { setStorageForTests } from "../storage/config";
import { STORAGE_PURPOSES } from "../storage/purposes";
import {
  actOnFile,
  completeUpload,
  partUrls,
  startUpload,
  type Requester,
  type StorageDeps,
} from "../storage/service";
import { setTrust } from "../storage/standing";
import { getFile } from "../storage/store";
import type { ProjectInput, ReleaseInput } from "./input";
import {
  deleteProject,
  deleteRelease,
  HIDDEN_BY_PROJECT_REPORTS,
  minecraftExport,
  removeGalleryImage,
  reportProject,
  resolveProjectReports,
} from "./service";
import {
  ANONYMOUS,
  adminCounts,
  adminProjects,
  fileUses,
  setFeatured,
  setHidden,
  attachGalleryImage,
  attachReleaseFile,
  canSee,
  createProject,
  createRelease,
  findProject,
  galleryOf,
  getProject,
  listProjects,
  pickDownload,
  projectDownloads,
  projectsOf,
  releasesOf,
  updateProject,
  type Viewer,
} from "./store";

// A ZIP's first bytes (an empty archive is enough for the type checks).
const ZIP = new Uint8Array([
  0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]);
const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13,
]);

let handle: DatabaseHandle;
let storage: LocalDriver;
let deps: StorageDeps;
let admin: Requester;
let alice: Requester;
let bob: Requester;
let clock: Date;

const viewer = (requester: Requester): Viewer => ({
  userId: requester.user.id,
  isAdmin: requester.isAdmin,
});

const project = (overrides: Partial<ProjectInput> = {}): ProjectInput => ({
  type: "mod",
  name: "Better Redstone",
  slug: "better-redstone",
  summary: "Smarter repeaters.",
  description: "## Features\n\nIt *works*.",
  edition: "java",
  tags: ["redstone", "tech"],
  license: "MIT",
  licenseText: null,
  links: [],
  state: "public",
  ...overrides,
});

const release = (overrides: Partial<ReleaseInput> = {}): ReleaseInput => ({
  version: "1.0.0",
  title: "",
  channel: "release",
  changelog: "First!",
  gameVersions: ["1.21.4"],
  loaders: ["fabric"],
  dependencies: [],
  ...overrides,
});

beforeEach(async () => {
  handle = await openDatabase("memory://");
  storage = new LocalDriver({ root: null, baseUrl: "/s" });
  setStorageForTests(storage);
  clock = new Date("2026-10-05T12:00:00Z");
  const user = (id: number, login: string) =>
    upsertGitHubUser(handle.db, { id, login, name: null });
  const adminUser = await user(1, "owner");
  admin = { user: adminUser, isAdmin: true };
  // Accounts old enough for their reports to count.
  clock = new Date("2026-10-20T12:00:00Z");
  alice = { user: await user(2, "alice"), isAdmin: false };
  bob = { user: await user(3, "bob"), isAdmin: false };
  deps = {
    db: handle.db,
    storage,
    isAdminId: (id) => Promise.resolve(id === adminUser.id),
    purposes: STORAGE_PURPOSES,
    now: () => clock,
  };
});

afterEach(async () => {
  setStorageForTests(undefined);
  await handle.close();
});

async function newProject(
  requester: Requester,
  overrides: Partial<ProjectInput> = {},
): Promise<McProject> {
  const result = await createProject(
    handle.db,
    requester.user,
    requester.isAdmin,
    project(overrides),
    clock,
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

async function newRelease(
  requester: Requester,
  owned: McProject,
  overrides: Partial<ReleaseInput> = {},
): Promise<McRelease> {
  const result = await createRelease(
    handle.db,
    owned,
    viewer(requester),
    release(overrides),
    clock,
  );
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

/** Uploads a file the way the editor does: start, attach, send, complete. */
async function upload(
  requester: Requester,
  purpose: string,
  name: string,
  data: Uint8Array,
  attach: (fileId: string) => Promise<{ ok: boolean; error?: string }>,
) {
  const started = await startUpload(deps, requester, {
    purpose,
    name,
    size: data.length,
  });
  if (!started.ok) throw new Error(started.error);
  const { file, plan } = started.value;
  const attached = await attach(file.id);
  if (!attached.ok) throw new Error(attached.error);
  const parts = Array.from({ length: plan.partCount }, (_, i) => i + 1);
  const urls = await partUrls(deps, requester, file.id, parts);
  if (!urls.ok) throw new Error(urls.error);
  for (const n of parts) {
    const url = urls.value[String(n)] ?? "";
    await storage.handle(
      new Request("http://x/", { method: "PUT", body: new Uint8Array(data) }),
      url.replace(/^\/s\//, ""),
    );
  }
  const done = await completeUpload(deps, requester, file.id);
  if (!done.ok) throw new Error(done.error);
  return done.value;
}

async function releaseFile(
  requester: Requester,
  owned: McProject,
  version: McRelease,
  name = "better-redstone-1.0.0.jar",
  primary = true,
) {
  return upload(requester, "minecraft", name, ZIP, (fileId) =>
    attachReleaseFile(handle.db, owned, version, fileId, primary, clock),
  );
}

const fresh = async (id: number) => {
  const row = await getProject(handle.db, id);
  if (!row) throw new Error("gone");
  return row;
};

const owner = async (requester: Requester) => {
  const [row] = await handle.db
    .select()
    .from(users)
    .where(eq(users.id, requester.user.id));
  return row ?? null;
};

describe("projects", () => {
  it("stays out of sight until a release's main file is published", async () => {
    const mod = await newProject(alice);
    const v1 = await newRelease(alice, mod);
    expect(canSee(await fresh(mod.id), await owner(alice), ANONYMOUS)).toBe(
      false,
    );
    expect(canSee(mod, await owner(alice), viewer(alice))).toBe(true);

    // Mods are always reviewed.
    const file = await releaseFile(alice, mod, v1);
    expect(file.status).toBe("pending_review");
    expect((await listProjects(handle.db)).total).toBe(0);

    const approved = await actOnFile(deps, admin, file.id, "approve");
    expect(approved.ok).toBe(true);
    const live = await fresh(mod.id);
    expect(live.lastReleasedAt).toEqual(clock);
    expect(canSee(live, await owner(alice), ANONYMOUS)).toBe(true);

    const { cards, total } = await listProjects(handle.db);
    expect(total).toBe(1);
    expect(cards[0]).toMatchObject({
      slug: "better-redstone",
      ownerLogin: "alice",
      gameVersions: ["1.21.4"],
      loaders: ["fabric"],
    });

    // Taken down: out of sight again.
    await actOnFile(deps, admin, file.id, "remove", "Malware");
    expect((await fresh(mod.id)).lastReleasedAt).toBeNull();
    expect((await listProjects(handle.db)).total).toBe(0);
  });

  it("reviews .jar files even from trusted creators, but not their packs", async () => {
    await setTrust(handle.db, {
      userId: alice.user.id,
      mode: "trusted",
      actorId: admin.user.id,
      now: clock,
    });
    const mod = await newProject(alice);
    const jar = await releaseFile(alice, mod, await newRelease(alice, mod));
    expect(jar.status).toBe("pending_review");

    const pack = await newProject(alice, {
      type: "resource_pack",
      slug: "crisp",
      name: "Crisp",
    });
    const zip = await releaseFile(
      alice,
      pack,
      await newRelease(alice, pack, { loaders: [] }),
      "crisp.zip",
    );
    expect(zip.status).toBe("published");
  });

  it("publishes the admin's files at once", async () => {
    const mod = await newProject(admin);
    const file = await releaseFile(admin, mod, await newRelease(admin, mod));
    expect(file.status).toBe("published");
    expect((await fresh(mod.id)).lastReleasedAt).not.toBeNull();
  });

  it("refuses a main file of the wrong type, and someone else's upload", async () => {
    const mod = await newProject(alice);
    const v1 = await newRelease(alice, mod);
    await expect(releaseFile(alice, mod, v1, "world.mcworld")).rejects.toThrow(
      "main file is .jar, .mcaddon, .mcpack",
    );

    const started = await startUpload(deps, bob, {
      purpose: "minecraft",
      name: "x.jar",
      size: ZIP.length,
    });
    if (!started.ok) throw new Error(started.error);
    const result = await attachReleaseFile(
      handle.db,
      mod,
      v1,
      started.value.file.id,
      true,
    );
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("keeps old slugs as redirects once it has been public", async () => {
    const mod = await newProject(admin);
    await releaseFile(admin, mod, await newRelease(admin, mod));
    const renamed = await updateProject(
      handle.db,
      await fresh(mod.id),
      project({ slug: "redstone-plus", name: "Redstone+" }),
      clock,
    );
    expect(renamed.ok).toBe(true);
    expect(await findProject(handle.db, "better-redstone")).toMatchObject({
      moved: true,
      project: { slug: "redstone-plus" },
    });
    // The old slug stays reserved for the redirect.
    const clash = await createProject(
      handle.db,
      alice.user,
      false,
      project(),
      clock,
    );
    expect(clash).toMatchObject({ ok: false, status: 409 });
  });

  it("refuses a version twice in a project", async () => {
    const mod = await newProject(alice);
    await newRelease(alice, mod);
    const again = await createRelease(
      handle.db,
      mod,
      viewer(alice),
      release(),
      clock,
    );
    expect(again).toMatchObject({ ok: false, status: 409 });
  });

  it("hides drafts, unlisted projects and blocked creators from listings", async () => {
    const listed = await newProject(admin, { slug: "listed" });
    await releaseFile(admin, listed, await newRelease(admin, listed));
    const unlisted = await newProject(admin, {
      slug: "unlisted",
      state: "unlisted",
    });
    await releaseFile(admin, unlisted, await newRelease(admin, unlisted));
    const draft = await newProject(admin, { slug: "draft", state: "draft" });
    await releaseFile(admin, draft, await newRelease(admin, draft));

    const { cards } = await listProjects(handle.db);
    expect(cards.map((card) => card.slug)).toEqual(["listed"]);
    expect(
      canSee(await fresh(unlisted.id), await owner(admin), ANONYMOUS),
    ).toBe(true);
    expect(canSee(await fresh(draft.id), await owner(admin), ANONYMOUS)).toBe(
      false,
    );

    await handle.db
      .update(users)
      .set({ blockedAt: clock })
      .where(eq(users.id, admin.user.id));
    expect((await listProjects(handle.db)).total).toBe(0);
  });

  it("filters by type, version, loader, tag, edition and search", async () => {
    const mod = await newProject(admin);
    await releaseFile(admin, mod, await newRelease(admin, mod));
    const plugin = await newProject(admin, {
      type: "plugin",
      slug: "tiny-shops",
      name: "Tiny Shops",
      summary: "Chest shops for Paper servers.",
      tags: ["economy"],
      edition: "java",
    });
    await releaseFile(
      admin,
      plugin,
      await newRelease(admin, plugin, {
        gameVersions: ["1.20.4"],
        loaders: ["paper"],
      }),
      "shops.jar",
    );

    const slugs = async (filter: Parameters<typeof listProjects>[1]) =>
      (await listProjects(handle.db, filter)).cards.map((card) => card.slug);
    expect(await slugs({ type: "plugin" })).toEqual(["tiny-shops"]);
    expect(await slugs({ version: "1.21.4" })).toEqual(["better-redstone"]);
    expect(await slugs({ loader: "paper" })).toEqual(["tiny-shops"]);
    expect(await slugs({ tag: "redstone" })).toEqual(["better-redstone"]);
    expect(await slugs({ edition: "bedrock" })).toEqual([]);
    expect(await slugs({ q: "chest shops" })).toEqual(["tiny-shops"]);
    expect(await slugs({ q: "Redst" })).toEqual(["better-redstone"]);
  });
});

describe("releases and downloads", () => {
  it("picks the newest stable file that fits", async () => {
    const mod = await newProject(admin);
    const v1 = await newRelease(admin, mod, { gameVersions: ["1.20.4"] });
    await releaseFile(admin, mod, v1, "a-1.jar");
    clock = new Date(clock.getTime() + 60_000);
    const v2 = await newRelease(admin, mod, {
      version: "2.0.0",
      gameVersions: ["1.21.4"],
    });
    await releaseFile(admin, mod, v2, "a-2.jar");
    clock = new Date(clock.getTime() + 60_000);
    const beta = await newRelease(admin, mod, {
      version: "3.0.0-beta",
      channel: "beta",
      gameVersions: ["1.21.4"],
    });
    await releaseFile(admin, mod, beta, "a-3.jar");

    expect((await pickDownload(handle.db, mod.id))?.release.version).toBe(
      "2.0.0",
    );
    expect(
      (await pickDownload(handle.db, mod.id, { version: "1.20.4" }))?.release
        .version,
    ).toBe("1.0.0");
    expect(
      (await pickDownload(handle.db, mod.id, { channel: "beta" }))?.release
        .version,
    ).toBe("3.0.0-beta");
    expect(
      await pickDownload(handle.db, mod.id, { loader: "forge" }),
    ).toBeUndefined();
  });

  it("shows others live releases and published files only", async () => {
    const mod = await newProject(alice);
    const v1 = await newRelease(alice, mod);
    const main = await releaseFile(alice, mod, v1);
    await newRelease(alice, mod, { version: "1.1.0" });

    expect(await releasesOf(handle.db, await fresh(mod.id), ANONYMOUS)).toEqual(
      [],
    );
    const mine = await releasesOf(
      handle.db,
      await fresh(mod.id),
      viewer(alice),
    );
    expect(mine.map((entry) => [entry.release.version, entry.live])).toEqual([
      ["1.1.0", false],
      ["1.0.0", false],
    ]);

    await actOnFile(deps, admin, main.id, "approve");
    const seen = await releasesOf(handle.db, await fresh(mod.id), ANONYMOUS);
    expect(seen.map((entry) => entry.release.version)).toEqual(["1.0.0"]);
    expect(seen[0]?.files.map((entry) => entry.primary)).toEqual([true]);
  });

  it("deletes a release with its files, and the project goes dark", async () => {
    const mod = await newProject(admin);
    const v1 = await newRelease(admin, mod);
    const file = await releaseFile(admin, mod, v1);
    expect((await fresh(mod.id)).lastReleasedAt).not.toBeNull();
    await deleteRelease(deps, admin, await fresh(mod.id), v1);
    expect((await getFile(handle.db, file.id))?.status).toBe("deleted");
    expect((await fresh(mod.id)).lastReleasedAt).toBeNull();
  });

  it("links dependencies to public projects here, by slug or address", async () => {
    const api = await newProject(admin, {
      slug: "fabric-api",
      name: "Fabric API",
    });
    await releaseFile(admin, api, await newRelease(admin, api));
    const mod = await newProject(alice);
    const result = await createRelease(
      handle.db,
      mod,
      viewer(alice),
      release({
        dependencies: [
          {
            kind: "required",
            slug: "fabric-api",
            name: "fabric-api",
            url: null,
          },
          {
            kind: "optional",
            slug: null,
            name: "Sodium",
            url: "https://modrinth.com/mod/sodium",
          },
        ],
      }),
      clock,
    );
    expect(result.ok).toBe(true);
    const [entry] = await releasesOf(handle.db, mod, viewer(alice));
    expect(
      entry?.dependencies.map((dep) => [dep.kind, dep.name, dep.slug]),
    ).toEqual([
      ["required", "Fabric API", "fabric-api"],
      ["optional", "Sodium", null],
    ]);

    const missing = await createRelease(
      handle.db,
      mod,
      viewer(alice),
      release({
        version: "2",
        dependencies: [
          { kind: "required", slug: "nope", name: "nope", url: null },
        ],
      }),
      clock,
    );
    expect(missing).toMatchObject({ ok: false, status: 400 });
  });
});

describe("gallery", () => {
  it("adds images, makes the first the cover, and shows others published ones", async () => {
    const mod = await newProject(alice);
    const image = await upload(
      alice,
      "minecraft-media",
      "shot.png",
      PNG,
      async (fileId) =>
        attachGalleryImage(
          handle.db,
          await fresh(mod.id),
          viewer(alice),
          fileId,
          "Repeaters",
          clock,
        ),
    );
    expect(image.status).toBe("pending_review");
    expect((await fresh(mod.id)).coverFileId).toBe(image.id);
    expect(await galleryOf(handle.db, await fresh(mod.id), ANONYMOUS)).toEqual(
      [],
    );
    expect(
      await galleryOf(handle.db, await fresh(mod.id), viewer(alice)),
    ).toHaveLength(1);

    await actOnFile(deps, admin, image.id, "approve");
    const [shown] = await galleryOf(handle.db, await fresh(mod.id), ANONYMOUS);
    expect(shown).toMatchObject({
      isCover: true,
      image: { caption: "Repeaters" },
    });

    const removed = await removeGalleryImage(
      deps,
      alice,
      await fresh(mod.id),
      shown?.image.id ?? 0,
    );
    expect(removed.ok).toBe(true);
    expect((await fresh(mod.id)).coverFileId).toBeNull();
    expect((await getFile(handle.db, image.id))?.status).toBe("deleted");
  });

  it("lets descriptions show the project's own published images only", async () => {
    const mod = await newProject(admin);
    const image = await upload(
      admin,
      "minecraft-media",
      "shot.png",
      PNG,
      async (fileId) =>
        attachGalleryImage(
          handle.db,
          await fresh(mod.id),
          viewer(admin),
          fileId,
          "",
          clock,
        ),
    );
    const row = await getFile(handle.db, image.id);
    const url = storage.publicUrl(row?.key ?? "");
    const updated = await updateProject(
      handle.db,
      await fresh(mod.id),
      project({
        description: `![Ours](${url})\n\n![Theirs](https://example.com/x.png)`,
      }),
      clock,
    );
    if (!updated.ok) throw new Error(updated.error);
    expect(updated.value.descriptionHtml).toContain(
      `<img src="${url}" alt="Ours"`,
    );
    expect(updated.value.descriptionHtml).not.toContain("example.com");
  });
});

describe("reports, deletion and export", () => {
  it("hides a project after enough reports, until the admin decides", async () => {
    const mod = await newProject(alice);
    const file = await releaseFile(alice, mod, await newRelease(alice, mod));
    await actOnFile(deps, admin, file.id, "approve");
    const carol = {
      user: await upsertGitHubUser(handle.db, {
        id: 4,
        login: "carol",
        name: null,
      }),
      isAdmin: false,
    };
    const dave = {
      user: await upsertGitHubUser(handle.db, {
        id: 5,
        login: "dave",
        name: null,
      }),
      isAdmin: false,
    };
    // Accounts made "now" don't count yet; age them.
    await handle.db
      .update(users)
      .set({ createdAt: new Date("2026-01-01T00:00:00Z") });

    for (const reporter of [bob, carol, dave]) {
      const result = await reportProject(deps, reporter, await fresh(mod.id), {
        reason: "spam",
        details: "",
      });
      expect(result.ok).toBe(true);
    }
    const hidden = await fresh(mod.id);
    expect(hidden.hiddenReason).toBe(HIDDEN_BY_PROJECT_REPORTS);
    expect(canSee(hidden, await owner(alice), ANONYMOUS)).toBe(false);

    await resolveProjectReports(deps, hidden, "dismissed", null);
    expect((await fresh(mod.id)).hiddenAt).toBeNull();
  });

  it("deletes a project with its files, and exports what it kept", async () => {
    const mod = await newProject(alice);
    const file = await releaseFile(alice, mod, await newRelease(alice, mod));
    const data = await minecraftExport(deps, alice.user.id);
    expect(data.projects[0]).toMatchObject({
      slug: "better-redstone",
      releases: [
        { version: "1.0.0", files: [{ fileId: file.id, main: true }] },
      ],
    });
    expect(await projectsOf(handle.db, alice.user.id)).toMatchObject([
      { slug: "better-redstone", pending: 1 },
    ]);

    await deleteProject(deps, alice, await fresh(mod.id));
    expect(await getProject(handle.db, mod.id)).toBeUndefined();
    expect((await getFile(handle.db, file.id))?.status).toBe("deleted");
  });

  it("counts downloads across a project's files", async () => {
    const mod = await newProject(admin);
    const file = await releaseFile(admin, mod, await newRelease(admin, mod));
    expect(await projectDownloads(handle.db, mod.id)).toBe(0);
    await handle.db
      .update(files)
      .set({ downloads: 7 })
      .where(eq(files.id, file.id));
    expect(await projectDownloads(handle.db, mod.id)).toBe(7);
    expect(
      (await listProjects(handle.db, { sort: "downloads" })).cards[0]
        ?.downloads,
    ).toBe(7);
  });
});

describe("admin", () => {
  it("says which project a file belongs to", async () => {
    const mod = await newProject(alice);
    const v1 = await newRelease(alice, mod);
    const main = await releaseFile(alice, mod, v1);
    const image = await upload(
      alice,
      "minecraft-media",
      "shot.png",
      PNG,
      async (fileId) =>
        attachGalleryImage(
          handle.db,
          await fresh(mod.id),
          viewer(alice),
          fileId,
          "",
          clock,
        ),
    );
    const uses = await fileUses(handle.db, [main.id, image.id, "nope"]);
    expect(uses.get(main.id)).toMatchObject({
      name: "Better Redstone",
      version: "1.0.0",
      role: "main file",
    });
    expect(uses.get(image.id)).toMatchObject({
      version: null,
      role: "gallery image",
    });
    expect(uses.has("nope")).toBe(false);
  });

  it("lists every project with filters and counts", async () => {
    const mod = await newProject(alice);
    await newProject(bob, { slug: "other", name: "Other Thing" });
    await setFeatured(handle.db, mod.id, true, clock);
    await setHidden(handle.db, mod.id, "Spam", clock);
    const all = await adminProjects(handle.db);
    expect(all.map((row) => row.project.slug).sort()).toEqual([
      "better-redstone",
      "other",
    ]);
    expect(
      (await adminProjects(handle.db, { q: "bob" })).map(
        (row) => row.project.slug,
      ),
    ).toEqual(["other"]);
    expect(
      (await adminProjects(handle.db, { filter: "hidden" })).map(
        (row) => row.project.slug,
      ),
    ).toEqual(["better-redstone"]);
    expect(await adminProjects(handle.db, { q: "100%_" })).toEqual([]);
    expect(await adminCounts(handle.db)).toEqual({
      projects: 2,
      hidden: 1,
      featured: 1,
      reports: 0,
    });
  });
});
