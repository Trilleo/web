/**
 * Sends over SMTP with Nodemailer: Tencent Cloud SES in production
 * (smtp.qcloudmail.com:465, TLS from the first byte; see deploy/mail.md).
 * One connection per message: the site sends a few a day, not a stream.
 */
import { createTransport } from "nodemailer";
import {
  MailError,
  checkHeaders,
  type MailDriver,
  type OutgoingMail,
} from "./driver";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

/** Nodemailer's errors carry the server's reply code (550, 421, …) when there was one. */
interface SmtpFailure {
  message?: unknown;
  code?: unknown;
  responseCode?: unknown;
}

/** Whether the server said no for good. A refused login is a setup problem: retry. */
export function isPermanentFailure(error: SmtpFailure): boolean {
  if (error.code === "EAUTH" || error.code === "ENOAUTH") return false;
  if (error.code === "EENVELOPE" && typeof error.responseCode !== "number")
    return true;
  return (
    typeof error.responseCode === "number" &&
    error.responseCode >= 500 &&
    error.responseCode < 600
  );
}

export function toMailError(error: unknown): MailError {
  if (error instanceof MailError) return error;
  const failure: SmtpFailure =
    error !== null && typeof error === "object" ? error : {};
  const message =
    typeof failure.message === "string" ? failure.message : String(error);
  return new MailError(
    message,
    isPermanentFailure(failure),
    typeof failure.code === "string" ? failure.code : undefined,
  );
}

export class SmtpDriver implements MailDriver {
  readonly kind = "smtp";
  private readonly transport;

  constructor(config: SmtpConfig) {
    this.transport = createTransport({
      host: config.host,
      port: config.port,
      // 465 speaks TLS at once; anything else upgrades with STARTTLS, required.
      secure: config.port === 465,
      requireTLS: config.port !== 465,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      // Messages are only ever text we wrote: never read files or URLs into them.
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  async send(mail: OutgoingMail): Promise<{ messageId: string | null }> {
    checkHeaders(mail);
    try {
      const info = await this.transport.sendMail({
        from: mail.from,
        to: mail.to,
        replyTo: mail.replyTo ?? undefined,
        subject: mail.subject,
        text: mail.text,
        html: mail.html ?? undefined,
        headers: mail.headers ? { ...mail.headers } : undefined,
      });
      return {
        messageId: typeof info.messageId === "string" ? info.messageId : null,
      };
    } catch (error) {
      throw toMailError(error);
    }
  }

  async verify(): Promise<void> {
    try {
      await this.transport.verify();
    } catch (error) {
      throw toMailError(error);
    }
  }
}
