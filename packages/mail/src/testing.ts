/** A driver for tests: remembers what it sent, and fails on demand. */
import {
  MailError,
  checkHeaders,
  type MailDriver,
  type OutgoingMail,
} from "./driver";

export class RecordingDriver implements MailDriver {
  readonly kind = "smtp";
  readonly sent: OutgoingMail[] = [];
  /** The next sends throw this (one per send, in order). */
  readonly failures: MailError[] = [];

  failNext(message = "Connection refused", permanent = false): this {
    this.failures.push(new MailError(message, permanent));
    return this;
  }

  send(mail: OutgoingMail): Promise<{ messageId: string | null }> {
    checkHeaders(mail);
    const failure = this.failures.shift();
    if (failure) return Promise.reject(failure);
    this.sent.push(mail);
    return Promise.resolve({ messageId: `<${String(this.sent.length)}@test>` });
  }

  verify(): Promise<void> {
    const failure = this.failures.shift();
    return failure ? Promise.reject(failure) : Promise.resolve();
  }
}
