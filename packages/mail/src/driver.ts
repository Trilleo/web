/**
 * How mail leaves the site. The app only talks to this interface: SMTP in
 * production (smtp.ts), a driver that keeps everything in dev and tests.
 */

export interface OutgoingMail {
  /** `"Name" <address>`. */
  from: string;
  to: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  html?: string | null;
  /** Extra headers (List-Unsubscribe, …). Values must not contain line breaks. */
  headers?: Readonly<Record<string, string>>;
}

export interface MailDriver {
  /** smtp: sends for real. capture: keeps the message (dev, e2e, not set up). */
  readonly kind: "smtp" | "capture";
  /** Hands the message over. Throws MailError when it can't. */
  send(mail: OutgoingMail): Promise<{ messageId: string | null }>;
  /** Checks the connection and login, without sending. */
  verify(): Promise<void>;
}

/**
 * Sending failed. `permanent`: the server refused this message for good (an
 * address that doesn't exist, say), so trying again won't help.
 */
export class MailError extends Error {
  constructor(
    message: string,
    readonly permanent: boolean,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MailError";
  }
}

/**
 * Sends nothing: the outbox marks the message "captured" instead. With `log` (only
 * `pnpm dev`), each message's recipient and subject are passed to it: sign-in codes
 * are in the subject, so a fresh dev database can sign in before anyone can read
 * /admin/mail/.
 */
export class CaptureDriver implements MailDriver {
  readonly kind = "capture";

  constructor(private readonly log?: (line: string) => void) {}

  send(mail?: OutgoingMail): Promise<{ messageId: string | null }> {
    if (mail && this.log)
      this.log(`Mail captured for ${mail.to}: ${mail.subject}`);
    return Promise.resolve({ messageId: null });
  }

  verify(): Promise<void> {
    return Promise.resolve();
  }
}

/** Header values from our own code still never get to end a line. */
export function checkHeaders(mail: OutgoingMail): void {
  const values = [
    mail.from,
    mail.to,
    mail.replyTo ?? "",
    mail.subject,
    ...Object.entries(mail.headers ?? {}).flat(),
  ];
  if (values.some((value) => /[\r\n\0]/.test(value)))
    throw new MailError("A header contains a line break.", true);
}
