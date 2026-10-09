/**
 * The admin answers a contact message by email, from /admin/messages/, to the
 * address the sender left. The reply goes through the outbox like any email; its
 * row (ref "contact:<id>") is how the inbox shows what was already said.
 */
import {
  contactMessages,
  type ContactMessage,
  type Database,
} from "@trilleo/db";
import { normalizeEmail } from "@trilleo/mail";
import { eq } from "drizzle-orm";
import { composeDirect, excerpt } from "../mail/compose";
import { queueMail } from "../mail/outbox";
import { SITE_NAME, SITE_URL } from "../site";

export const REPLY_MAX_LENGTH = 5000;

export function contactRef(id: number): string {
  return `contact:${String(id)}`;
}

export type ReplyResult = { ok: true } | { ok: false; error: string };

export async function replyToMessage(
  db: Database,
  input: {
    message: ContactMessage;
    body: string;
    /** Where their answer goes (MAIL_REPLY_TO); null: replies aren't read. */
    replyTo: string | null;
    available: boolean;
  },
  now = new Date(),
): Promise<ReplyResult> {
  const { message } = input;
  const to = message.email ? normalizeEmail(message.email) : null;
  if (!to)
    return { ok: false, error: "This message has no address to reply to." };
  if (!input.available)
    return { ok: false, error: "Mail isn’t set up on this server." };
  const body = input.body.replace(/\r\n/g, "\n").trim();
  if (body.length === 0) return { ok: false, error: "Write the reply first." };
  if (body.length > REPLY_MAX_LENGTH)
    return {
      ok: false,
      error: `Keep it under ${REPLY_MAX_LENGTH.toLocaleString("en")} characters.`,
    };

  const mail = composeDirect(
    `Re: your message to ${SITE_NAME}`,
    {
      preheader: excerpt(body, 120),
      label: "Contact",
      title: `Hello ${message.name}`,
      blocks: [
        { type: "text", text: body },
        {
          type: "text",
          text: `You wrote on ${message.createdAt.toISOString().slice(0, 10)}:`,
        },
        { type: "quote", text: excerpt(message.body, 1500) },
      ],
    },
    [
      `You get this because you wrote through the contact page at ${SITE_URL} and left this address.`,
      input.replyTo
        ? "Reply to this email to answer."
        : "Replies to this address aren’t read: write through the contact page again to answer.",
    ],
  );
  await queueMail(
    db,
    {
      kind: "contact-reply",
      to,
      userId: message.userId,
      replyTo: input.replyTo,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      ref: contactRef(message.id),
    },
    now,
  );
  await db
    .update(contactMessages)
    .set({
      repliedAt: now,
      ...(message.status === "new" ? { status: "read" as const } : {}),
    })
    .where(eq(contactMessages.id, message.id));
  return { ok: true };
}

export async function getMessage(
  db: Database,
  id: number,
): Promise<ContactMessage | undefined> {
  const [row] = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.id, id))
    .limit(1);
  return row;
}
