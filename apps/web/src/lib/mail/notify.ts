/**
 * Notifications to people: what happened, written for them, queued in the outbox.
 * Only to a proved address, only with that topic on, never to blocked accounts, and
 * never about something they did themselves. A notification that can't be written
 * is logged and dropped: it must never break the action that caused it.
 *
 * This module only reads the tables it needs (no storage or Minecraft services), so
 * those services can call it without import cycles.
 */
import {
  comments,
  posts,
  users,
  type Comment,
  type Database,
  type McProject,
  type StoredFile,
  type User,
} from "@trilleo/db";
import { MAIL_KINDS, type EmailBlock, type MailKind } from "@trilleo/mail";
import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { isAdmin } from "../auth/guard";
import { projectPath } from "../minecraft/paths";
import { postHref } from "../posts";
import { commentName } from "../profile/profile";
import { SITE_NAME } from "../site";
import { notificationsOf } from "./addresses";
import {
  absoluteUrl,
  composeNotification,
  excerpt,
  type NotificationBody,
} from "./compose";
import { queueMail } from "./outbox";

/** Runs a notification without letting it fail the caller. */
export async function safely(what: string, run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    console.error(`Couldn’t queue the ${what} email:`, error);
  }
}

async function userById(db: Database, id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

/**
 * Queues one notification for `user`, if they want it. Returns whether it was
 * queued.
 */
export async function notifyUser(
  db: Database,
  user: User | undefined,
  kind: Exclude<MailKind, "email-code" | "contact-reply" | "test">,
  message: { subject: string; body: NotificationBody; ref?: string },
  now = new Date(),
): Promise<boolean> {
  const topic = MAIL_KINDS[kind].topic;
  if (!user?.email || !user.emailToken || user.blockedAt) return false;
  if (!notificationsOf(user)[topic]) return false;
  const mail = composeNotification(message.subject, message.body, {
    emailToken: user.emailToken,
    topic,
  });
  await queueMail(
    db,
    {
      kind,
      to: user.email,
      userId: user.id,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      headers: mail.headers,
      ref: message.ref ?? null,
    },
    now,
  );
  return true;
}

async function postTitle(db: Database, slug: string): Promise<string> {
  const [post] = await db
    .select({ title: posts.title })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);
  return post?.title ?? slug;
}

function signature(author: User | undefined): string {
  if (!author) return "Someone";
  const name = commentName(author);
  return name ? `${name} (@${author.username})` : `@${author.username}`;
}

function commentUrl(comment: Pick<Comment, "postSlug" | "id">): string {
  return absoluteUrl(
    `${postHref(comment.postSlug)}#comment-${String(comment.id)}`,
  );
}

/**
 * A reply went live (posted by someone trusted, or approved): tells the thread's
 * starter and everyone else who replied in it, except the reply's own author.
 */
export async function notifyReply(
  db: Database,
  reply: Comment,
  now = new Date(),
): Promise<number> {
  if (reply.parentId === null || reply.status !== "published") return 0;
  const thread = await db
    .select({ authorId: comments.authorId })
    .from(comments)
    .where(
      and(
        or(
          eq(comments.id, reply.parentId),
          eq(comments.parentId, reply.parentId),
        ),
        ne(comments.id, reply.id),
        eq(comments.status, "published"),
        isNull(comments.deletedAt),
      ),
    );
  const ids = [
    ...new Set(
      thread
        .map((row) => row.authorId)
        .filter((id): id is string => id !== null && id !== reply.authorId),
    ),
  ];
  if (ids.length === 0) return 0;
  const people = await db.select().from(users).where(inArray(users.id, ids));
  const author = reply.authorId
    ? await userById(db, reply.authorId)
    : undefined;
  const title = await postTitle(db, reply.postSlug);
  let sent = 0;
  for (const person of people) {
    const queued = await notifyUser(
      db,
      person,
      "comment-reply",
      {
        subject: `New reply on “${title}”`,
        body: {
          preheader: excerpt(reply.body, 120),
          label: "Comments",
          title: `${signature(author)} replied`,
          blocks: [
            {
              type: "text",
              text: `In a thread you’re part of, on “${title}”:`,
            },
            { type: "quote", text: excerpt(reply.body) },
            {
              type: "button",
              label: "Read the thread",
              href: commentUrl(reply),
            },
          ],
        },
        ref: `comment:${String(reply.id)}`,
      },
      now,
    );
    if (queued) sent += 1;
  }
  return sent;
}

export type CommentOutcome = "approved" | "hidden" | "removed";

/** The admin approved, hid or removed someone's comment (not their own). */
export async function notifyCommentReview(
  db: Database,
  comment: Comment,
  outcome: CommentOutcome,
  now = new Date(),
): Promise<boolean> {
  if (!comment.authorId) return false;
  const author = await userById(db, comment.authorId);
  if (!author || isAdmin(author)) return false;
  const title = await postTitle(db, comment.postSlug);
  const copy = {
    approved: {
      subject: `Your comment on “${title}” is live`,
      title: "Your comment is live",
      text: `Your comment on “${title}” was approved, so everyone can read it now. From now on your comments appear right away.`,
    },
    hidden: {
      subject: `Your comment on “${title}” was hidden`,
      title: "Your comment was hidden",
      text: `The admin hid your comment on “${title}”, so only you can see it. The community guidelines say what’s welcome; if you think this was a mistake, write through the contact page.`,
    },
    removed: {
      subject: `Your comment on “${title}” was removed`,
      title: "Your comment was removed",
      text: `The admin removed your comment on “${title}”. The community guidelines say what’s welcome; if you think this was a mistake, write through the contact page.`,
    },
  }[outcome];
  return notifyUser(
    db,
    author,
    "comment-review",
    {
      subject: copy.subject,
      body: {
        label: "Comments",
        title: copy.title,
        blocks: [
          { type: "text", text: copy.text },
          { type: "quote", text: excerpt(comment.body) },
          outcome === "approved"
            ? {
                type: "button",
                label: "See it on the post",
                href: commentUrl(comment),
              }
            : {
                type: "button",
                label: "Read the guidelines",
                href: absoluteUrl("/legal/guidelines/"),
              },
        ],
      },
      ref: `comment:${String(comment.id)}`,
    },
    now,
  );
}

/** What happened to a file, from storage's changeStatus. */
export interface FileChange {
  action: string;
  from: string;
  to: string;
  reason: string | null;
  actorId: string | null;
}

const FILE_COPY: Record<
  string,
  { subject: string; title: string; text: string } | undefined
> = {
  approve: {
    subject: "Your file was approved",
    title: "Approved",
    text: "Your upload was reviewed and is live now.",
  },
  clear: {
    subject: "Your file is live",
    title: "Checked and live",
    text: "Your upload has been checked for malware and is live now.",
  },
  reject: {
    subject: "Your file was refused",
    title: "Refused",
    text: "Your upload was reviewed and refused, so it isn’t shown anywhere.",
  },
  fail: {
    subject: "Your file was refused",
    title: "Refused",
    text: "Your upload was refused when it was checked, so it isn’t shown anywhere.",
  },
  remove: {
    subject: "Your file was taken down",
    title: "Taken down",
    text: "Your file was taken down and isn’t shown anywhere any more.",
  },
  flag: {
    subject: "Your file is hidden for review",
    title: "Hidden for review",
    text: "Several people reported your file, so it’s hidden until the admin has looked at it.",
  },
  restore: {
    subject: "Your file is back",
    title: "Restored",
    text: "Your file was restored and is shown again.",
  },
};

/**
 * A file's status changed. The uploader hears about decisions on it (by the admin
 * or the checks), not about their own actions, and the admin's own files are quiet.
 */
export async function notifyFileChange(
  db: Database,
  file: StoredFile,
  change: FileChange,
  now = new Date(),
): Promise<boolean> {
  const copy = FILE_COPY[change.action];
  if (!copy || !file.ownerId || change.actorId === file.ownerId) return false;
  const owner = await userById(db, file.ownerId);
  if (!owner || isAdmin(owner)) return false;
  const refused = change.to === "rejected" || change.to === "removed";
  const blocks: EmailBlock[] = [
    { type: "text", text: copy.text },
    {
      type: "facts",
      rows: [
        ["File", file.name],
        ...(change.reason ? ([["Why", change.reason]] as const) : []),
      ],
    },
  ];
  if (refused)
    blocks.push({
      type: "text",
      text: "Refused and taken-down files can count as a strike. Your files page shows your standing, and you can appeal there once per file while it’s kept.",
    });
  blocks.push({
    type: "button",
    label: refused ? "Your files" : "Open the file",
    href: absoluteUrl(refused ? "/account/files/" : `/files/${file.id}/`),
  });
  return notifyUser(
    db,
    owner,
    "file-review",
    {
      subject: `${copy.subject}: ${excerpt(file.name, 60)}`,
      body: { label: "Files", title: copy.title, blocks },
      ref: `file:${file.id}`,
    },
    now,
  );
}

/** The admin decided an appeal. */
export async function notifyAppealDecision(
  db: Database,
  input: {
    userId: string;
    file: StoredFile | undefined;
    accepted: boolean;
    response: string;
  },
  now = new Date(),
): Promise<boolean> {
  const owner = await userById(db, input.userId);
  const name = input.file?.name ?? "your file";
  return notifyUser(
    db,
    owner,
    "appeal-decision",
    {
      subject: input.accepted
        ? `Appeal accepted: ${excerpt(name, 60)}`
        : `Appeal declined: ${excerpt(name, 60)}`,
      body: {
        label: "Files",
        title: input.accepted
          ? "Your appeal was accepted"
          : "Your appeal was declined",
        blocks: [
          {
            type: "text",
            text: input.accepted
              ? "The file is restored, and the strike for it is gone."
              : "The decision on the file stands.",
          },
          {
            type: "facts",
            rows: [
              ["File", name],
              ...(input.response.trim()
                ? ([["Answer", input.response.trim()]] as const)
                : []),
            ],
          },
          {
            type: "button",
            label: "Your files",
            href: absoluteUrl("/account/files/"),
          },
        ],
      },
      ...(input.file ? { ref: `file:${input.file.id}` } : {}),
    },
    now,
  );
}

/** A Minecraft project was hidden (by the admin or by reports) or shown again. */
export async function notifyProjectVisibility(
  db: Database,
  project: McProject,
  hiddenReason: string | null,
  now = new Date(),
): Promise<boolean> {
  const owner = await userById(db, project.ownerId);
  if (!owner || isAdmin(owner)) return false;
  const hidden = hiddenReason !== null;
  return notifyUser(
    db,
    owner,
    "project-review",
    {
      subject: hidden
        ? `“${project.name}” is hidden`
        : `“${project.name}” is visible again`,
      body: {
        label: "Minecraft",
        title: hidden
          ? "Your project is hidden"
          : "Your project is visible again",
        blocks: [
          {
            type: "text",
            text: hidden
              ? `Others can’t see “${project.name}” on ${SITE_NAME} for now. You can still edit it.`
              : `“${project.name}” is listed and can be downloaded again.`,
          },
          ...(hidden ? [{ type: "quote" as const, text: hiddenReason }] : []),
          {
            type: "button",
            label: hidden ? "Your projects" : "See the project",
            href: absoluteUrl(
              hidden ? "/account/minecraft/" : projectPath(project),
            ),
          },
        ],
      },
      ref: `project:${String(project.id)}`,
    },
    now,
  );
}
