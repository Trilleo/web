/**
 * The events webhooks can ask for. Each has a name ("cryptic.day"), a scope its app
 * must have (if any), the shape of its `data` (a schema, so the Webhooks guide
 * describes it the same way the reference describes answers) and an example. A new
 * event goes here, plus whatever emits it (emit.ts), plus a changelog entry.
 */
import {
  EXAMPLE_PUZZLE,
  EXAMPLE_REVEALED,
  puzzleSchema,
} from "../routes/cryptic";
import { t, type Schema } from "../schema";
import type { ApiScope } from "../scopes";

export interface WebhookEvent {
  summary: string;
  /** When it's sent (Markdown). */
  when: string;
  scope: ApiScope | null;
  data: Schema<unknown>;
  example: unknown;
}

export const WEBHOOK_EVENTS = {
  "cryptic.day": {
    summary: "A new day of the daily cryptic.",
    when: "Once a day, a few seconds after 00:00 UTC: today's puzzle (no answer) and yesterday's (with its answer), so a bot can post both. Sent even when there's no puzzle today (`today` is null). Its ID is `cryptic.day:<date>`.",
    scope: "cryptic:read",
    data: t.object({
      date: t.date("The new day."),
      today: t.nullable(puzzleSchema),
      yesterday: t.nullable(puzzleSchema),
    }),
    example: {
      date: "2026-10-23",
      today: EXAMPLE_PUZZLE,
      yesterday: EXAMPLE_REVEALED,
    },
  },
  "post.published": {
    summary: "A post went up on the site's blog.",
    when: "Within a minute or two of a post becoming public (published, or its scheduled time arriving). Once per post: its ID is `post.published:<post number>`.",
    scope: null,
    data: t.object({
      post: t.object({
        slug: t.string({
          description: "Its address on the site: /writing/<slug>/.",
        }),
        title: t.string(),
        description: t.string({ description: "A sentence or two about it." }),
        url: t.string({ format: "uri" }),
        tags: t.array(t.string()),
        publishedAt: t.dateTime(),
      }),
    }),
    example: {
      post: {
        slug: "rebuilding-this-site",
        title: "Rebuilding this site",
        description: "Why the site moved to Astro, and what changed.",
        url: "https://www.trilleo.net/writing/rebuilding-this-site/",
        tags: ["astro", "web"],
        publishedAt: "2026-10-23T08:00:00.000Z",
      },
    },
  },
  ping: {
    summary: "A test, sent from the control panel.",
    when: "Only when the admin presses “Send a test” for the webhook. Every webhook gets it whatever events it chose.",
    scope: null,
    data: t.object({
      message: t.string({ description: "Says it's a test." }),
    }),
    example: { message: "A test from Trilleo Network." },
  },
} as const satisfies Record<string, WebhookEvent>;

export type WebhookEventName = keyof typeof WEBHOOK_EVENTS;

/** Events a webhook can choose (ping is always sent). */
export const CHOOSABLE_EVENTS = (
  Object.keys(WEBHOOK_EVENTS) as WebhookEventName[]
).filter((name) => name !== "ping");

export function isWebhookEvent(value: string): value is WebhookEventName {
  return Object.hasOwn(WEBHOOK_EVENTS, value);
}

/** The body every delivery sends. */
export interface WebhookPayload {
  /** The event's own ID, the same in every retry and redelivery: use it to skip repeats. */
  id: string;
  type: WebhookEventName;
  createdAt: string;
  data: unknown;
}
