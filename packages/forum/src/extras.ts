/**
 * Polls, attachments and private messages: their limits and the checks that need
 * no database, so they're tested alone.
 */

// ---------------------------------------------------------------------------
// Polls

export const POLL_LIMITS = {
  question: { min: 3, max: 200 },
  option: { max: 100 },
  options: { min: 2, max: 10 },
} as const;

/** How long a poll stays open, from the new-topic form. */
export const POLL_LENGTHS = {
  never: { label: "Stays open", days: null },
  "1d": { label: "1 day", days: 1 },
  "3d": { label: "3 days", days: 3 },
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
} as const;

export type PollLength = keyof typeof POLL_LENGTHS;

export function isPollLength(value: string): value is PollLength {
  return Object.hasOwn(POLL_LENGTHS, value);
}

export interface PollDraft {
  question: string;
  /** One option per line. */
  options: string;
  multiple: boolean;
  /** For multiple choice: at most this many ("" for no limit). */
  maxChoices: string;
  length: string;
  resultsBeforeVote: boolean;
}

export interface PollInput {
  question: string;
  options: string[];
  multiple: boolean;
  maxChoices: number | null;
  closesAt: Date | null;
  resultsBeforeVote: boolean;
}

export type PollField = "question" | "options" | "maxChoices";

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const graphemes = new Intl.Segmenter("en", { granularity: "grapheme" });
/** Characters as people count them. */
const charCount = (value: string) =>
  Array.from(graphemes.segment(value)).length;

/** Checks a poll as typed. An empty question and options mean "no poll". */
export function validatePoll(
  draft: PollDraft,
  now: Date,
):
  | { ok: true; poll: PollInput | null }
  | { ok: false; errors: Partial<Record<PollField, string>> } {
  const question = oneLine(draft.question);
  const options = [
    ...new Set(
      draft.options
        .split("\n")
        .map(oneLine)
        .filter((line) => line !== ""),
    ),
  ];
  if (!question && options.length === 0) return { ok: true, poll: null };
  const errors: Partial<Record<PollField, string>> = {};
  if (charCount(question) < POLL_LIMITS.question.min)
    errors.question = "Ask the poll’s question.";
  else if (charCount(question) > POLL_LIMITS.question.max)
    errors.question = `Up to ${String(POLL_LIMITS.question.max)} characters.`;
  if (options.length < POLL_LIMITS.options.min)
    errors.options = `Give at least ${String(POLL_LIMITS.options.min)} different options, one per line.`;
  else if (options.length > POLL_LIMITS.options.max)
    errors.options = `Up to ${String(POLL_LIMITS.options.max)} options.`;
  else if (options.some((option) => charCount(option) > POLL_LIMITS.option.max))
    errors.options = `Each option can be up to ${String(POLL_LIMITS.option.max)} characters.`;
  let maxChoices: number | null = null;
  if (draft.multiple && draft.maxChoices.trim() !== "") {
    const value = Number(draft.maxChoices);
    if (!Number.isInteger(value) || value < 1 || value > options.length)
      errors.maxChoices =
        "A number from 1 to how many options there are, or empty.";
    else maxChoices = value;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const length = isPollLength(draft.length)
    ? POLL_LENGTHS[draft.length]
    : POLL_LENGTHS.never;
  return {
    ok: true,
    poll: {
      question,
      options,
      multiple: draft.multiple,
      maxChoices,
      closesAt:
        length.days === null
          ? null
          : new Date(now.getTime() + length.days * 86_400_000),
      resultsBeforeVote: draft.resultsBeforeVote,
    },
  };
}

/** Whether a set of chosen options is a valid vote. */
export function validVote(
  poll: { multiple: boolean; maxChoices: number | null },
  chosen: readonly number[],
  optionIds: readonly number[],
): boolean {
  const unique = new Set(chosen);
  if (unique.size === 0 || unique.size !== chosen.length) return false;
  if (![...unique].every((id) => optionIds.includes(id))) return false;
  if (!poll.multiple) return unique.size === 1;
  return poll.maxChoices === null || unique.size <= poll.maxChoices;
}

// ---------------------------------------------------------------------------
// Attachments

export const ATTACHMENT_LIMITS = {
  /** Per file. */
  bytes: 10 * 1024 * 1024,
  perPost: 5,
} as const;

/** Shown in the post, opened full size in the lightbox. */
export const IMAGE_EXTENSIONS: readonly string[] = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
];

export const ATTACHMENT_EXTENSIONS: readonly string[] = [
  ...IMAGE_EXTENSIONS,
  "pdf",
  "zip",
  "txt",
  "schem",
  "schematic",
  "litematic",
  "nbt",
  "mcstructure",
  "mcpack",
  "mcworld",
];

export function isImageName(name: string): boolean {
  const extension = name.toLowerCase().split(".").pop() ?? "";
  return IMAGE_EXTENSIONS.includes(extension);
}

// ---------------------------------------------------------------------------
// Private messages

export const MESSAGE_LIMITS = {
  body: 5000,
  subject: 120,
  /** People in a conversation, the starter included. */
  members: 10,
  burst: { count: 10, windowMs: 10 * 60_000 },
  daily: { count: 100, windowMs: 24 * 60 * 60_000 },
  /** New conversations someone may start a day. */
  newPerDay: 10,
} as const;

/** Who may start a conversation with someone (forum_user_settings.messages). */
export const MESSAGE_PRIVACY = {
  everyone: "Any member",
  contacts: "Only people I’ve talked to",
  nobody: "Nobody",
} as const;

export type MessagePrivacy = keyof typeof MESSAGE_PRIVACY;

export function isMessagePrivacy(value: string): value is MessagePrivacy {
  return Object.hasOwn(MESSAGE_PRIVACY, value);
}

/**
 * Whether a sender may start a conversation with (or add) someone, given that
 * person's setting, whether they've talked before, and blocks either way. Staff
 * (moderators everywhere, the admin) may always reach people.
 */
export function mayMessage(input: {
  staff: boolean;
  privacy: MessagePrivacy;
  talkedBefore: boolean;
  blocked: boolean;
}): boolean {
  if (input.staff) return true;
  if (input.blocked) return false;
  if (input.privacy === "nobody") return false;
  if (input.privacy === "contacts") return input.talkedBefore;
  return true;
}
