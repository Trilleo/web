/**
 * Topic polls: made with the topic (or added by its asker later), voted on until
 * they close (a closing date, or closed by the asker or a moderator), and votes can
 * change until then. Members see totals; moderators can see who voted.
 */
import {
  forumPollOptions,
  forumPollVotes,
  forumPolls,
  forumPosts,
  forumTopics,
  users,
  type Database,
  type ForumPoll,
} from "@trilleo/db";
import { validVote, type PollInput } from "@trilleo/forum";
import { and, asc, count, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { notifyPollClosed } from "./notifications";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Db = Database | Tx;

export async function createPoll(
  db: Db,
  topicId: number,
  input: PollInput,
  now = new Date(),
): Promise<ForumPoll> {
  const [poll] = await db
    .insert(forumPolls)
    .values({
      topicId,
      question: input.question,
      multiple: input.multiple,
      maxChoices: input.maxChoices,
      closesAt: input.closesAt,
      resultsBeforeVote: input.resultsBeforeVote,
      createdAt: now,
    })
    .returning();
  if (!poll) throw new Error("Saving the poll returned nothing");
  await db
    .insert(forumPollOptions)
    .values(
      input.options.map((label, sort) => ({ pollId: poll.id, label, sort })),
    );
  return poll;
}

export function isOpen(
  poll: Pick<ForumPoll, "closedAt" | "closesAt">,
  now = new Date(),
) {
  return (
    poll.closedAt === null && (poll.closesAt === null || poll.closesAt > now)
  );
}

export interface PollView {
  poll: ForumPoll;
  open: boolean;
  options: { id: number; label: string; votes: number; voters: string[] }[];
  /** People who voted (not votes: a multiple-choice voter counts once). */
  voters: number;
  /** The viewer's choices (empty: hasn't voted). */
  mine: number[];
  /** Totals are shown: they voted, the poll shows them anyway, or it's closed. */
  showResults: boolean;
}

/** A topic's poll as one viewer sees it; `withVoters` (moderators) names voters. */
export async function pollFor(
  db: Database,
  topicId: number,
  viewerId: string | null,
  options: { withVoters?: boolean; now?: Date } = {},
): Promise<PollView | null> {
  const [poll] = await db
    .select()
    .from(forumPolls)
    .where(eq(forumPolls.topicId, topicId))
    .limit(1);
  if (!poll) return null;
  const [rows, votes] = await Promise.all([
    db
      .select()
      .from(forumPollOptions)
      .where(eq(forumPollOptions.pollId, poll.id))
      .orderBy(asc(forumPollOptions.sort), asc(forumPollOptions.id)),
    db
      .select({
        optionId: forumPollVotes.optionId,
        userId: forumPollVotes.userId,
        username: users.username,
      })
      .from(forumPollVotes)
      .innerJoin(users, eq(users.id, forumPollVotes.userId))
      .where(eq(forumPollVotes.pollId, poll.id)),
  ]);
  const open = isOpen(poll, options.now);
  const mine = viewerId
    ? votes
        .filter((vote) => vote.userId === viewerId)
        .map((vote) => vote.optionId)
    : [];
  return {
    poll,
    open,
    options: rows.map((row) => {
      const by = votes.filter((vote) => vote.optionId === row.id);
      return {
        id: row.id,
        label: row.label,
        votes: by.length,
        voters: options.withVoters
          ? by.map((vote) => vote.username).sort()
          : [],
      };
    }),
    voters: new Set(votes.map((vote) => vote.userId)).size,
    mine,
    // Moderators (who see voters) always see the totals.
    showResults:
      !open ||
      poll.resultsBeforeVote ||
      mine.length > 0 ||
      options.withVoters === true,
  };
}

export type VoteError = "closed" | "invalid";

/** Sets someone's vote (replacing theirs). */
export async function votePoll(
  db: Database,
  input: {
    poll: ForumPoll;
    userId: string;
    optionIds: readonly number[];
    now?: Date;
  },
): Promise<VoteError | null> {
  const now = input.now ?? new Date();
  if (!isOpen(input.poll, now)) return "closed";
  const options = await db
    .select({ id: forumPollOptions.id })
    .from(forumPollOptions)
    .where(eq(forumPollOptions.pollId, input.poll.id));
  if (
    !validVote(
      input.poll,
      input.optionIds,
      options.map((row) => row.id),
    )
  )
    return "invalid";
  await db.transaction(async (tx) => {
    await tx
      .delete(forumPollVotes)
      .where(
        and(
          eq(forumPollVotes.pollId, input.poll.id),
          eq(forumPollVotes.userId, input.userId),
        ),
      );
    await tx.insert(forumPollVotes).values(
      input.optionIds.map((optionId) => ({
        pollId: input.poll.id,
        optionId,
        userId: input.userId,
        createdAt: now,
      })),
    );
  });
  return null;
}

/** Takes someone's vote back. */
export async function unvotePoll(
  db: Database,
  poll: ForumPoll,
  userId: string,
): Promise<void> {
  if (!isOpen(poll)) return;
  await db
    .delete(forumPollVotes)
    .where(
      and(
        eq(forumPollVotes.pollId, poll.id),
        eq(forumPollVotes.userId, userId),
      ),
    );
}

export async function closePoll(
  db: Database,
  poll: ForumPoll,
  now = new Date(),
): Promise<void> {
  await db
    .update(forumPolls)
    .set({ closedAt: now })
    .where(eq(forumPolls.id, poll.id));
}

export async function reopenPoll(db: Database, poll: ForumPoll): Promise<void> {
  await db
    .update(forumPolls)
    .set({ closedAt: null, closesAt: null, closeNotifiedAt: null })
    .where(eq(forumPolls.id, poll.id));
}

export async function pollOfTopic(
  db: Database,
  topicId: number,
): Promise<ForumPoll | undefined> {
  const [poll] = await db
    .select()
    .from(forumPolls)
    .where(eq(forumPolls.topicId, topicId))
    .limit(1);
  return poll;
}

export async function hasVotes(db: Database, pollId: number): Promise<boolean> {
  const [row] = await db
    .select({ total: count() })
    .from(forumPollVotes)
    .where(eq(forumPollVotes.pollId, pollId));
  return (row?.total ?? 0) > 0;
}

export async function deletePoll(db: Database, poll: ForumPoll): Promise<void> {
  await db.delete(forumPolls).where(eq(forumPolls.id, poll.id));
}

/**
 * Tells askers their polls closed (on their closing date, or by a moderator). Runs
 * from the mail delivery pass. Returns how many were told.
 */
export async function notifyClosedPolls(
  db: Database,
  now = new Date(),
): Promise<number> {
  const due = await db
    .select({ poll: forumPolls, topic: forumTopics, post: forumPosts })
    .from(forumPolls)
    .innerJoin(forumTopics, eq(forumTopics.id, forumPolls.topicId))
    .innerJoin(forumPosts, eq(forumPosts.id, forumTopics.firstPostId))
    .where(
      and(
        isNull(forumPolls.closeNotifiedAt),
        isNull(forumTopics.deletedAt),
        or(lte(forumPolls.closesAt, now), lte(forumPolls.closedAt, now)),
      ),
    )
    .limit(100);
  for (const { poll, topic, post } of due) {
    await db
      .update(forumPolls)
      .set({ closeNotifiedAt: now })
      .where(eq(forumPolls.id, poll.id));
    await notifyPollClosed(db, topic, post, now);
  }
  return due.length;
}

/** For the export: polls someone asked and how they voted. */
export async function pollsExport(db: Database, userId: string) {
  const votes = await db
    .select({
      question: forumPolls.question,
      option: forumPollOptions.label,
      at: forumPollVotes.createdAt,
    })
    .from(forumPollVotes)
    .innerJoin(forumPolls, eq(forumPolls.id, forumPollVotes.pollId))
    .innerJoin(
      forumPollOptions,
      eq(forumPollOptions.id, forumPollVotes.optionId),
    )
    .where(eq(forumPollVotes.userId, userId));
  const asked = await db
    .select({ question: forumPolls.question, topic: forumTopics.title })
    .from(forumPolls)
    .innerJoin(forumTopics, eq(forumTopics.id, forumPolls.topicId))
    .where(inArray(forumTopics.authorId, [userId]));
  return { asked, votes };
}
