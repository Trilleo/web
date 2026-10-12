/**
 * Proposed edits: anyone signed in who reads a wiki but can't change a page proposes
 * its new text; the wiki's members (owners only, for protected pages) approve it,
 * which saves it as the proposer's revision on top of the current one, or decline it
 * with a note. Proposers can withdraw while it waits. Both sides hear by email.
 */
import {
  users,
  wikiLog,
  wikiMembers,
  wikiProposals,
  wikis,
  type Database,
  type User,
  type Wiki,
  type WikiProposal,
  type WikiProposalStatus,
} from "@trilleo/db";
import { and, asc, count, desc, eq, gt, inArray, type SQL } from "drizzle-orm";
import { excerpt } from "../mail/compose";
import { notifyUser, safely } from "../mail/notify";
import { generatedPages } from "./generated";
import { WIKI_URL } from "./host";
import {
  PAGE_LIMITS,
  findPage,
  getRevision,
  savePage,
  type WikiRef,
} from "./store";
import { titleKey } from "./titles";
import { watch } from "./watch";
import { toolHref } from "./wikis";

export const PROPOSAL_LIMITS = {
  /** Proposals one account makes in a day, across every wiki. */
  perDay: 10,
  /** Proposals one account has waiting in one wiki. */
  pendingPerWiki: 5,
  /** Characters of a decline note. */
  note: 500,
} as const;

export const PROPOSAL_STATUS_LABELS: Readonly<
  Record<WikiProposalStatus, string>
> = {
  pending: "Waiting",
  approved: "Approved",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

type ProposalWiki = WikiRef & Pick<Wiki, "name">;

export function proposalHref(wiki: Pick<Wiki, "slug">, id: number): string {
  return `${toolHref(wiki, "proposals")}/${String(id)}`;
}

export type ProposeResult =
  | { ok: true; proposal: WikiProposal }
  | {
      ok: false;
      error:
        | "too-long"
        | "generated"
        | "unchanged"
        | "empty"
        | "daily-limit"
        | "pending-limit";
    };

/** Records a proposal and tells the people who can approve it. */
export async function propose(
  db: Database,
  input: {
    wiki: ProposalWiki;
    author: User;
    title: string;
    body: string;
    summary: string;
    /** The revision the text was made from; null for a new page. */
    baseRevisionId: number | null;
    now?: Date;
  },
): Promise<ProposeResult> {
  const now = input.now ?? new Date();
  const body = input.body.replace(/\r\n?/g, "\n");
  if (body.trim() === "") return { ok: false, error: "empty" };
  if (body.length > PAGE_LIMITS.body) return { ok: false, error: "too-long" };
  const key = titleKey(input.title);
  const generated = await generatedPages(input.wiki);
  if (generated?.pages.has(key)) return { ok: false, error: "generated" };
  const page = await findPage(db, input.wiki.id, key);
  const current =
    page && !page.deletedAt && page.revisionId !== null
      ? await getRevision(db, input.wiki.id, page.revisionId)
      : undefined;
  if (current?.body === body) return { ok: false, error: "unchanged" };

  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [today] = await db
    .select({ total: count() })
    .from(wikiProposals)
    .where(
      and(
        eq(wikiProposals.authorId, input.author.id),
        gt(wikiProposals.createdAt, dayAgo),
      ),
    );
  if ((today?.total ?? 0) >= PROPOSAL_LIMITS.perDay)
    return { ok: false, error: "daily-limit" };
  const [waiting] = await db
    .select({ total: count() })
    .from(wikiProposals)
    .where(
      and(
        eq(wikiProposals.authorId, input.author.id),
        eq(wikiProposals.wikiId, input.wiki.id),
        eq(wikiProposals.status, "pending"),
      ),
    );
  if ((waiting?.total ?? 0) >= PROPOSAL_LIMITS.pendingPerWiki)
    return { ok: false, error: "pending-limit" };

  const [proposal] = await db
    .insert(wikiProposals)
    .values({
      wikiId: input.wiki.id,
      title: page && !page.deletedAt ? page.title : input.title,
      baseRevisionId: input.baseRevisionId,
      authorId: input.author.id,
      body,
      summary: input.summary.trim().slice(0, PAGE_LIMITS.summary),
      createdAt: now,
    })
    .returning();
  if (!proposal) throw new Error("Saving the proposal returned nothing");
  await watch(db, input.author.id, input.wiki.id, key, now);
  await safely("wiki proposal", () =>
    notifyReviewers(db, input.wiki, proposal, input.author, {
      protectedPage: page?.protection === "owners",
      now,
    }),
  );
  return { ok: true, proposal };
}

async function notifyReviewers(
  db: Database,
  wiki: ProposalWiki,
  proposal: WikiProposal,
  author: User,
  options: { protectedPage: boolean; now: Date },
): Promise<void> {
  const roles: ("owner" | "editor")[] = options.protectedPage
    ? ["owner"]
    : ["owner", "editor"];
  const reviewers = await db
    .select({ user: users })
    .from(wikiMembers)
    .innerJoin(users, eq(users.id, wikiMembers.userId))
    .where(
      and(eq(wikiMembers.wikiId, wiki.id), inArray(wikiMembers.role, roles)),
    );
  for (const { user } of reviewers) {
    if (user.id === author.id) continue;
    await notifyUser(
      db,
      user,
      "wiki-proposal",
      {
        subject: `Proposed edit to “${proposal.title}” on ${wiki.name}`,
        body: {
          label: "Wiki",
          title: `@${author.username} proposed an edit`,
          preheader: proposal.summary || `To ${proposal.title}`,
          blocks: [
            {
              type: "text",
              text: `To “${proposal.title}” on the ${wiki.name} wiki, which you help run. It waits for a member to approve or decline it.`,
            },
            {
              type: "facts",
              rows: [
                ["Page", proposal.title],
                ...(proposal.summary
                  ? ([["Summary", proposal.summary]] as const)
                  : []),
              ],
            },
            {
              type: "button",
              label: "Review it",
              href: `${WIKI_URL}${proposalHref(wiki, proposal.id)}`,
            },
          ],
        },
        ref: `wiki-proposal:${String(proposal.id)}`,
      },
      options.now,
    );
  }
}

async function notifyDecision(
  db: Database,
  wiki: ProposalWiki,
  proposal: WikiProposal,
  reviewer: User,
  now: Date,
): Promise<void> {
  if (proposal.authorId === reviewer.id) return;
  const [author] = await db
    .select()
    .from(users)
    .where(eq(users.id, proposal.authorId))
    .limit(1);
  const approved = proposal.status === "approved";
  await notifyUser(
    db,
    author,
    "wiki-decision",
    {
      subject: approved
        ? `Your edit to “${proposal.title}” was approved`
        : `Your edit to “${proposal.title}” was declined`,
      body: {
        label: "Wiki",
        title: approved ? "Your edit is live" : "Your edit was declined",
        blocks: [
          {
            type: "text",
            text: approved
              ? `@${reviewer.username} approved the edit you proposed to “${proposal.title}” on the ${wiki.name} wiki. It’s in the page’s history under your name.`
              : `@${reviewer.username} declined the edit you proposed to “${proposal.title}” on the ${wiki.name} wiki. Your text is kept with the proposal.`,
          },
          ...(proposal.note
            ? [{ type: "quote" as const, text: excerpt(proposal.note) }]
            : []),
          {
            type: "button",
            label: approved ? "See the page" : "See the proposal",
            href: `${WIKI_URL}${proposalHref(wiki, proposal.id)}`,
          },
        ],
      },
      ref: `wiki-proposal:${String(proposal.id)}`,
    },
    now,
  );
}

export interface ProposalRow {
  id: number;
  title: string;
  summary: string;
  status: WikiProposalStatus;
  createdAt: Date;
  decidedAt: Date | null;
  author: string;
}

/**
 * A wiki's proposals, newest first: all of them for members, or one person's own.
 * `status` narrows them (the queue is "pending").
 */
export async function listProposals(
  db: Database,
  wikiId: number,
  options: {
    status?: WikiProposalStatus;
    authorId?: string;
    limit?: number;
  } = {},
): Promise<ProposalRow[]> {
  const where: SQL[] = [eq(wikiProposals.wikiId, wikiId)];
  if (options.status) where.push(eq(wikiProposals.status, options.status));
  if (options.authorId)
    where.push(eq(wikiProposals.authorId, options.authorId));
  return db
    .select({
      id: wikiProposals.id,
      title: wikiProposals.title,
      summary: wikiProposals.summary,
      status: wikiProposals.status,
      createdAt: wikiProposals.createdAt,
      decidedAt: wikiProposals.decidedAt,
      author: users.username,
    })
    .from(wikiProposals)
    .innerJoin(users, eq(users.id, wikiProposals.authorId))
    .where(and(...where))
    .orderBy(
      options.status === "pending"
        ? asc(wikiProposals.id)
        : desc(wikiProposals.id),
    )
    .limit(options.limit ?? 100);
}

export async function pendingCount(
  db: Database,
  wikiId: number,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(wikiProposals)
    .where(
      and(
        eq(wikiProposals.wikiId, wikiId),
        eq(wikiProposals.status, "pending"),
      ),
    );
  return row?.total ?? 0;
}

export interface ProposalDetail {
  proposal: WikiProposal;
  author: string;
  reviewer: string | null;
}

export async function getProposal(
  db: Database,
  wikiId: number,
  id: number,
): Promise<ProposalDetail | undefined> {
  const [row] = await db
    .select({ proposal: wikiProposals, author: users.username })
    .from(wikiProposals)
    .innerJoin(users, eq(users.id, wikiProposals.authorId))
    .where(and(eq(wikiProposals.wikiId, wikiId), eq(wikiProposals.id, id)))
    .limit(1);
  if (!row) return undefined;
  let reviewer: string | null = null;
  if (row.proposal.reviewerId) {
    const [person] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, row.proposal.reviewerId))
      .limit(1);
    reviewer = person?.username ?? null;
  }
  return { proposal: row.proposal, author: row.author, reviewer };
}

/** Marks a waiting proposal decided; null when someone decided it first. */
async function decide(
  db: Database,
  proposal: WikiProposal,
  changes: Partial<WikiProposal> & { status: WikiProposalStatus },
): Promise<WikiProposal | null> {
  const [updated] = await db
    .update(wikiProposals)
    .set(changes)
    .where(
      and(
        eq(wikiProposals.id, proposal.id),
        eq(wikiProposals.status, "pending"),
      ),
    )
    .returning();
  return updated ?? null;
}

export type DecideResult =
  | { ok: true; proposal: WikiProposal }
  | {
      ok: false;
      error: "decided" | "unchanged" | "protected" | "too-long" | "generated";
    };

/**
 * Approves a proposal: its text becomes the page's next revision, by its author, on
 * top of whatever the page says now (the reviewer saw the difference to that).
 */
export async function approveProposal(
  db: Database,
  input: {
    wiki: ProposalWiki;
    reviewer: User;
    proposal: WikiProposal;
    canEditProtected: boolean;
    now?: Date;
  },
): Promise<DecideResult> {
  const now = input.now ?? new Date();
  const { proposal } = input;
  if (proposal.status !== "pending") return { ok: false, error: "decided" };
  const [author] = await db
    .select()
    .from(users)
    .where(eq(users.id, proposal.authorId))
    .limit(1);
  if (!author) return { ok: false, error: "decided" };
  // Claimed first, so two reviewers can't both save it.
  const claimed = await decide(db, proposal, {
    status: "approved",
    reviewerId: input.reviewer.id,
    decidedAt: now,
  });
  if (!claimed) return { ok: false, error: "decided" };
  const page = await findPage(db, input.wiki.id, titleKey(proposal.title));
  const label = `proposal #${String(proposal.id)}`;
  const saved = await savePage(db, {
    wiki: input.wiki,
    actor: author,
    title: proposal.title,
    body: proposal.body,
    summary: proposal.summary
      ? `${proposal.summary} (${label})`
      : `From ${label}`,
    minor: false,
    baseRevisionId: page && !page.deletedAt ? page.revisionId : null,
    canEditProtected: input.canEditProtected,
    now,
  });
  if (!saved.ok) {
    await db
      .update(wikiProposals)
      .set({ status: "pending", reviewerId: null, decidedAt: null })
      .where(eq(wikiProposals.id, proposal.id));
    return {
      ok: false,
      // Someone saved the page in between: the reviewer looks again.
      error: saved.error === "conflict" ? "decided" : saved.error,
    };
  }
  const [decided = claimed] = await db
    .update(wikiProposals)
    .set({ revisionId: saved.revision.id })
    .where(eq(wikiProposals.id, proposal.id))
    .returning();
  await db.insert(wikiLog).values({
    wikiId: input.wiki.id,
    actorId: input.reviewer.id,
    action: "proposal-approved",
    title: proposal.title,
    detail: `#${String(proposal.id)} by @${author.username}`,
    createdAt: now,
  });
  await safely("wiki decision", () =>
    notifyDecision(db, input.wiki, decided, input.reviewer, now),
  );
  return { ok: true, proposal: decided };
}

export async function declineProposal(
  db: Database,
  input: {
    wiki: ProposalWiki;
    reviewer: User;
    proposal: WikiProposal;
    note: string;
    now?: Date;
  },
): Promise<DecideResult> {
  const now = input.now ?? new Date();
  const decided = await decide(db, input.proposal, {
    status: "declined",
    reviewerId: input.reviewer.id,
    note: input.note.trim().slice(0, PROPOSAL_LIMITS.note),
    decidedAt: now,
  });
  if (!decided) return { ok: false, error: "decided" };
  const [author] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, decided.authorId))
    .limit(1);
  await db.insert(wikiLog).values({
    wikiId: input.wiki.id,
    actorId: input.reviewer.id,
    action: "proposal-declined",
    title: decided.title,
    detail: `#${String(decided.id)}${author ? ` by @${author.username}` : ""}${decided.note ? `: ${decided.note}` : ""}`,
    createdAt: now,
  });
  await safely("wiki decision", () =>
    notifyDecision(db, input.wiki, decided, input.reviewer, now),
  );
  return { ok: true, proposal: decided };
}

/** The author takes back a waiting proposal. */
export async function withdrawProposal(
  db: Database,
  proposal: WikiProposal,
  author: Pick<User, "id">,
  now = new Date(),
): Promise<boolean> {
  if (proposal.authorId !== author.id) return false;
  return (
    (await decide(db, proposal, { status: "withdrawn", decidedAt: now })) !==
    null
  );
}

/** For the account export: everything someone proposed. */
export async function proposalExport(db: Database, userId: string) {
  return db
    .select({
      wiki: wikis.slug,
      page: wikiProposals.title,
      status: wikiProposals.status,
      summary: wikiProposals.summary,
      note: wikiProposals.note,
      proposedAt: wikiProposals.createdAt,
      decidedAt: wikiProposals.decidedAt,
      text: wikiProposals.body,
    })
    .from(wikiProposals)
    .innerJoin(wikis, eq(wikis.id, wikiProposals.wikiId))
    .where(eq(wikiProposals.authorId, userId))
    .orderBy(asc(wikiProposals.id));
}
