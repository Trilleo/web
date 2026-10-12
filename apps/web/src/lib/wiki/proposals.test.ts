import {
  mailMessages,
  openDatabase,
  users,
  wikiProposals,
  type DatabaseHandle,
  type User,
  type Wiki,
} from "@trilleo/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { upsertGitHubUser } from "../auth/accounts";
import {
  PROPOSAL_LIMITS,
  approveProposal,
  declineProposal,
  getProposal,
  listProposals,
  proposalExport,
  propose,
  withdrawProposal,
} from "./proposals";
import {
  createWiki,
  findPage,
  getRevision,
  pageHistory,
  protectPage,
  savePage,
  setMember,
  wikiLogEntries,
} from "./store";
import { titleKey } from "./titles";
import { listWatches } from "./watch";

const now = new Date("2026-10-11T12:00:00Z");
let handle: DatabaseHandle;
let owner: User;
let editor: User;
let reader: User;
let wiki: Wiki;

async function withAddress(user: User): Promise<User> {
  const [updated] = await handle.db
    .update(users)
    .set({
      email: `${user.username}@example.com`,
      emailVerifiedAt: now,
      emailToken: `token-${user.username}-0123456789abcdef`,
    })
    .where(eq(users.id, user.id))
    .returning();
  if (!updated) throw new Error("no user");
  return updated;
}

beforeEach(async () => {
  handle = await openDatabase("memory://");
  const db = handle.db;
  owner = await withAddress(
    await upsertGitHubUser(db, { id: 1, login: "owner", name: null }),
  );
  editor = await withAddress(
    await upsertGitHubUser(db, { id: 2, login: "writer", name: null }),
  );
  reader = await withAddress(
    await upsertGitHubUser(db, { id: 3, login: "reader", name: null }),
  );
  const created = await createWiki(db, owner, {
    slug: "sky",
    name: "Sky",
    code: "SKY",
    description: "",
    kind: "game",
    visibility: "public",
    homeTitle: "Main Page",
    nav: [],
    source: null,
  });
  if (!created.ok) throw new Error("no wiki");
  wiki = created.wiki;
  await setMember(db, wiki, owner, "owner", "owner", now);
  await setMember(db, wiki, owner, "writer", "editor", now);
  await savePage(db, {
    wiki,
    actor: editor,
    title: "Ores",
    body: "Iron and gold.\n",
    summary: "",
    minor: false,
    baseRevisionId: null,
    canEditProtected: false,
    now,
  });
});
afterEach(async () => {
  await handle.close();
});

async function baseOf(title: string): Promise<number | null> {
  const page = await findPage(handle.db, wiki.id, titleKey(title));
  return page?.revisionId ?? null;
}

async function proposeOres(body = "Iron, gold and copper.\n", by = reader) {
  const result = await propose(handle.db, {
    wiki,
    author: by,
    title: "Ores",
    body,
    summary: "Add copper",
    baseRevisionId: await baseOf("Ores"),
    now,
  });
  if (!result.ok) throw new Error(result.error);
  return result.proposal;
}

async function mailTo(user: User) {
  return handle.db
    .select()
    .from(mailMessages)
    .where(eq(mailMessages.toAddress, user.email ?? ""));
}

describe("propose", () => {
  it("records the proposal, watches the page and tells the members", async () => {
    const proposal = await proposeOres();
    expect(proposal).toMatchObject({ status: "pending", title: "Ores" });
    const toOwner = await mailTo(owner);
    const toEditor = await mailTo(editor);
    expect(toOwner.map((mail) => mail.kind)).toEqual(["wiki-proposal"]);
    expect(toEditor.map((mail) => mail.kind)).toEqual(["wiki-proposal"]);
    expect(toOwner[0]?.subject).toContain("“Ores”");
    expect(toOwner[0]?.textBody).toContain(
      `https://wiki.trilleo.net/sky/-/proposals/${String(proposal.id)}`,
    );
    expect(await mailTo(reader)).toEqual([]);
    expect(
      (await listWatches(handle.db, reader.id)).map((w) => w.title),
    ).toEqual(["Ores"]);
  });

  it("only tells owners about protected pages", async () => {
    const page = await findPage(handle.db, wiki.id, titleKey("Ores"));
    if (!page) throw new Error("no page");
    await protectPage(handle.db, wiki, owner, page, "owners");
    await proposeOres();
    expect(await mailTo(owner)).toHaveLength(1);
    expect(await mailTo(editor)).toHaveLength(0);
  });

  it("refuses empty, unchanged and generated-title proposals", async () => {
    const base = await baseOf("Ores");
    const attempt = (body: string) =>
      propose(handle.db, {
        wiki,
        author: reader,
        title: "Ores",
        body,
        summary: "",
        baseRevisionId: base,
        now,
      });
    expect(await attempt("  \n")).toEqual({ ok: false, error: "empty" });
    expect(await attempt("Iron and gold.\r\n")).toEqual({
      ok: false,
      error: "unchanged",
    });
  });

  it("caps waiting proposals per wiki and proposals per day", async () => {
    for (let i = 0; i < PROPOSAL_LIMITS.pendingPerWiki; i += 1)
      await proposeOres(`Version ${String(i)}\n`);
    const more = await propose(handle.db, {
      wiki,
      author: reader,
      title: "Ores",
      body: "One more\n",
      summary: "",
      baseRevisionId: null,
      now,
    });
    expect(more).toEqual({ ok: false, error: "pending-limit" });

    // Withdrawn ones still count towards the day.
    for (const row of await listProposals(handle.db, wiki.id))
      await handle.db
        .update(wikiProposals)
        .set({ status: "withdrawn" })
        .where(eq(wikiProposals.id, row.id));
    const left: number =
      PROPOSAL_LIMITS.perDay - PROPOSAL_LIMITS.pendingPerWiki;
    for (let i = 0; i < left; i += 1)
      await proposeOres(`Later version ${String(i)}\n`);
    const tooMany = await propose(handle.db, {
      wiki,
      author: reader,
      title: "Other",
      body: "Text\n",
      summary: "",
      baseRevisionId: null,
      now,
    });
    expect(tooMany).toEqual({ ok: false, error: "daily-limit" });
  });
});

describe("approveProposal", () => {
  it("saves the text as the proposer's revision and tells them", async () => {
    const proposal = await proposeOres();
    const result = await approveProposal(handle.db, {
      wiki,
      reviewer: editor,
      proposal,
      canEditProtected: false,
      now,
    });
    expect(result.ok).toBe(true);
    const page = await findPage(handle.db, wiki.id, titleKey("Ores"));
    const revision = await getRevision(
      handle.db,
      wiki.id,
      page?.revisionId ?? 0,
    );
    expect(revision).toMatchObject({
      body: "Iron, gold and copper.\n",
      authorId: reader.id,
      summary: `Add copper (proposal #${String(proposal.id)})`,
    });
    const detail = await getProposal(handle.db, wiki.id, proposal.id);
    expect(detail).toMatchObject({
      reviewer: "writer",
      proposal: { status: "approved", revisionId: revision?.id },
    });
    expect((await mailTo(reader)).map((mail) => mail.kind)).toEqual([
      "wiki-decision",
    ]);
    const log = await wikiLogEntries(handle.db, wiki.id);
    expect(log[0]).toMatchObject({
      action: "proposal-approved",
      actor: "writer",
      detail: `#${String(proposal.id)} by @reader`,
    });
  });

  it("applies on top of edits made since, and can't be decided twice", async () => {
    const proposal = await proposeOres();
    await savePage(handle.db, {
      wiki,
      actor: editor,
      title: "Ores",
      body: "Iron, gold and tin.\n",
      summary: "",
      minor: false,
      baseRevisionId: await baseOf("Ores"),
      canEditProtected: false,
      now,
    });
    const first = await approveProposal(handle.db, {
      wiki,
      reviewer: editor,
      proposal,
      canEditProtected: false,
      now,
    });
    expect(first.ok).toBe(true);
    const page = await findPage(handle.db, wiki.id, titleKey("Ores"));
    if (!page) throw new Error("no page");
    expect(await pageHistory(handle.db, page.id)).toHaveLength(3);
    const again = await declineProposal(handle.db, {
      wiki,
      reviewer: owner,
      proposal,
      note: "",
      now,
    });
    expect(again).toEqual({ ok: false, error: "decided" });
  });

  it("creates a new page", async () => {
    const result = await propose(handle.db, {
      wiki,
      author: reader,
      title: "Copper",
      body: "A soft metal.\n",
      summary: "",
      baseRevisionId: null,
      now,
    });
    if (!result.ok) throw new Error(result.error);
    const approved = await approveProposal(handle.db, {
      wiki,
      reviewer: owner,
      proposal: result.proposal,
      canEditProtected: true,
      now,
    });
    expect(approved.ok).toBe(true);
    expect(
      await findPage(handle.db, wiki.id, titleKey("Copper")),
    ).toBeDefined();
  });

  it("keeps protected pages for owners, and leaves the proposal waiting", async () => {
    const proposal = await proposeOres();
    const page = await findPage(handle.db, wiki.id, titleKey("Ores"));
    if (!page) throw new Error("no page");
    await protectPage(handle.db, wiki, owner, page, "owners");
    const result = await approveProposal(handle.db, {
      wiki,
      reviewer: editor,
      proposal,
      canEditProtected: false,
      now,
    });
    expect(result).toEqual({ ok: false, error: "protected" });
    const detail = await getProposal(handle.db, wiki.id, proposal.id);
    expect(detail?.proposal.status).toBe("pending");
  });
});

describe("declineProposal and withdrawProposal", () => {
  it("declines with a note the proposer gets", async () => {
    const proposal = await proposeOres();
    const result = await declineProposal(handle.db, {
      wiki,
      reviewer: owner,
      proposal,
      note: "Copper isn't in the game yet.",
      now,
    });
    expect(result.ok).toBe(true);
    const [mail] = await mailTo(reader);
    expect(mail?.subject).toBe("Your edit to “Ores” was declined");
    expect(mail?.textBody).toContain("Copper isn't in the game yet.");
    const page = await findPage(handle.db, wiki.id, titleKey("Ores"));
    const revision = await getRevision(
      handle.db,
      wiki.id,
      page?.revisionId ?? 0,
    );
    expect(revision?.body).toBe("Iron and gold.\n");
  });

  it("lets only the author withdraw, while it waits", async () => {
    const proposal = await proposeOres();
    expect(await withdrawProposal(handle.db, proposal, editor)).toBe(false);
    expect(await withdrawProposal(handle.db, proposal, reader)).toBe(true);
    expect(await withdrawProposal(handle.db, proposal, reader)).toBe(false);
  });

  it("lists the queue and someone's own, and exports them", async () => {
    await proposeOres();
    expect(
      await listProposals(handle.db, wiki.id, { status: "pending" }),
    ).toHaveLength(1);
    expect(
      await listProposals(handle.db, wiki.id, { authorId: editor.id }),
    ).toHaveLength(0);
    expect(await proposalExport(handle.db, reader.id)).toMatchObject([
      { wiki: "sky", page: "Ores", status: "pending" },
    ]);
  });

  it("goes with the proposer's account", async () => {
    await proposeOres();
    await handle.db.delete(users).where(eq(users.id, reader.id));
    expect(await listProposals(handle.db, wiki.id)).toEqual([]);
  });
});
