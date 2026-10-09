/**
 * The parts every email shares: absolute links, the footer that says why someone
 * got it, and one-click unsubscribe (RFC 8058: List-Unsubscribe plus
 * List-Unsubscribe-Post, which Gmail and Yahoo expect).
 */
import {
  NOTIFICATION_LABELS,
  renderEmail,
  type EmailContent,
  type NotificationTopic,
} from "@trilleo/mail";
import { SITE_NAME, SITE_URL } from "../site";

/** Where people manage their address and notifications. */
export const EMAIL_SETTINGS_PATH = "/account/email/";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

export function unsubscribePath(
  token: string,
  topic: NotificationTopic,
): string {
  return `/mail/unsubscribe/${encodeURIComponent(token)}/?topic=${topic}`;
}

export interface ComposedMail {
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
}

export type NotificationBody = Omit<EmailContent, "footer" | "footerLinks">;

/** A notification someone can switch off: their topic's footer and unsubscribe headers. */
export function composeNotification(
  subject: string,
  body: NotificationBody,
  recipient: { emailToken: string; topic: NotificationTopic },
): ComposedMail {
  const unsubscribe = absoluteUrl(
    unsubscribePath(recipient.emailToken, recipient.topic),
  );
  const topic = NOTIFICATION_LABELS[recipient.topic].label.toLowerCase();
  const rendered = renderEmail({
    ...body,
    footer: [
      `You get this because “${topic}” is on in your ${SITE_NAME} email settings.`,
    ],
    footerLinks: [
      { label: "Email settings", href: absoluteUrl(EMAIL_SETTINGS_PATH) },
      { label: `Unsubscribe from ${topic}`, href: unsubscribe },
    ],
  });
  return {
    subject,
    ...rendered,
    headers: {
      "List-Unsubscribe": `<${unsubscribe}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** A message that isn't a notification (a code someone asked for, a reply, a test). */
export function composeDirect(
  subject: string,
  body: NotificationBody,
  footer: readonly string[],
): ComposedMail {
  return {
    subject,
    ...renderEmail({
      ...body,
      footer,
      footerLinks: [{ label: SITE_NAME, href: SITE_URL }],
    }),
    headers: {},
  };
}

/** Shortens someone's text for a quote: whole words, at most `max` characters. */
export function excerpt(text: string, max = 400): string {
  const flat = text.trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
