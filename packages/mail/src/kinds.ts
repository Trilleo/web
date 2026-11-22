/**
 * What the site emails about. Every message has a kind; the kind decides whether
 * people can switch it off (notifications) or always get it (security: codes they
 * asked for), and what the admin sees in /admin/mail/.
 */

/** The switches on /account/email/: one per kind of notification. */
export const NOTIFICATION_TOPICS = [
  "security",
  "replies",
  "comments",
  "reviews",
  "wiki",
  "watchlist",
  "forum",
  "skyblock",
  "admin",
] as const;
export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number];

export type NotificationSettings = Record<NotificationTopic, boolean>;

/** Everything on: adding an address is the opt-in. */
export const DEFAULT_NOTIFICATIONS: Readonly<NotificationSettings> = {
  security: true,
  replies: true,
  comments: true,
  reviews: true,
  wiki: true,
  watchlist: true,
  forum: true,
  skyblock: true,
  admin: true,
};

export const NOTIFICATION_LABELS: Readonly<
  Record<NotificationTopic, { label: string; hint: string }>
> = {
  security: {
    label: "Sign-in alerts",
    hint: "Sign-ins from a new browser.",
  },
  replies: {
    label: "Replies to your comments",
    hint: "Replies in your threads.",
  },
  comments: {
    label: "Your comments’ review",
    hint: "Approved, hidden or removed.",
  },
  reviews: {
    label: "Uploads and Minecraft projects",
    hint: "Decisions on files, appeals and projects.",
  },
  wiki: {
    label: "Wiki proposals",
    hint: "Proposed edits and their decisions.",
  },
  watchlist: {
    label: "Wiki watchlist",
    hint: "A daily digest of watched pages.",
  },
  forum: {
    label: "Forum",
    hint: "Watched topics and forums, mentions, answers.",
  },
  skyblock: {
    label: "SkyBlock reminders",
    hint: "The events you asked to be reminded of.",
  },
  admin: {
    label: "Admin alerts",
    hint: "Messages, reviews, reports, appeals.",
  },
};

/** Settings as stored (JSON), with anything missing or odd set to its default. */
export function parseNotificationSettings(
  value: unknown,
): NotificationSettings {
  const source =
    value !== null && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const settings = { ...DEFAULT_NOTIFICATIONS };
  for (const topic of NOTIFICATION_TOPICS) {
    const flag = source[topic];
    if (typeof flag === "boolean") settings[topic] = flag;
  }
  return settings;
}

export function isNotificationTopic(
  value: unknown,
): value is NotificationTopic {
  return (NOTIFICATION_TOPICS as readonly unknown[]).includes(value);
}

/**
 * Every kind of message. `topic`: the switch that turns it off (none: always sent).
 * `secret`: holds a code or link that works on its own, so its body is cleared as
 * soon as it has been sent.
 */
export const MAIL_KINDS = {
  "email-code": { label: "Email code", topic: null, secret: true },
  /** To the old address after a change, with a link to undo it. */
  "email-changed": { label: "Address changed", topic: null, secret: true },
  "new-sign-in": { label: "New sign-in", topic: "security", secret: false },
  "comment-reply": { label: "Comment reply", topic: "replies", secret: false },
  "comment-review": {
    label: "Comment review",
    topic: "comments",
    secret: false,
  },
  "file-review": { label: "File review", topic: "reviews", secret: false },
  "appeal-decision": {
    label: "Appeal decision",
    topic: "reviews",
    secret: false,
  },
  "project-review": {
    label: "Project review",
    topic: "reviews",
    secret: false,
  },
  "wiki-proposal": { label: "Wiki proposal", topic: "wiki", secret: false },
  "wiki-decision": {
    label: "Wiki proposal decided",
    topic: "wiki",
    secret: false,
  },
  "wiki-digest": { label: "Wiki watchlist", topic: "watchlist", secret: false },
  "forum-notification": {
    label: "Forum notification",
    topic: "forum",
    secret: false,
  },
  "forum-digest": { label: "Forum digest", topic: "forum", secret: false },
  "skyblock-reminder": {
    label: "SkyBlock reminder",
    topic: "skyblock",
    secret: false,
  },
  "contact-reply": { label: "Contact reply", topic: null, secret: false },
  "admin-alert": { label: "Admin alert", topic: "admin", secret: false },
  test: { label: "Test", topic: null, secret: false },
} as const satisfies Record<
  string,
  { label: string; topic: NotificationTopic | null; secret: boolean }
>;

export type MailKind = keyof typeof MAIL_KINDS;

export const MAIL_KIND_NAMES = Object.keys(MAIL_KINDS) as MailKind[];

export function isMailKind(value: unknown): value is MailKind {
  return typeof value === "string" && Object.hasOwn(MAIL_KINDS, value);
}

/**
 * Where a message is. queued: waiting (or retrying) to be sent; sending: being
 * handed over; sent: the provider took it; failed: gave up (or refused for good);
 * captured: kept here instead of sent (dev, e2e, or mail not set up); cancelled:
 * the admin stopped it.
 */
export const MAIL_STATUSES = [
  "queued",
  "sending",
  "sent",
  "failed",
  "captured",
  "cancelled",
] as const;
export type MailStatus = (typeof MAIL_STATUSES)[number];
