/**
 * How the server sends mail, from its environment (read at runtime, never inlined):
 *   SMTP_HOST, SMTP_USER, SMTP_PASSWORD (+ SMTP_PORT, default 465)
 *                    → sends over SMTP (production: Tencent Cloud SES, deploy/mail.md)
 *   MAIL_CAPTURE=1   → keeps every message in the outbox instead (e2e)
 *   neither, in dev  → keeps them too (read them at /admin/mail/)
 *   neither, otherwise → mail is off: messages are kept, and features that need a
 *                        message to arrive (email codes) say they aren't available
 *   MAIL_FROM        the sender (default: DEFAULT_FROM)
 *   MAIL_REPLY_TO    where answers to the admin's replies go (optional)
 *   MAIL_ADMIN_TO    who gets admin alerts, comma-separated (default: the admins'
 *                    own verified addresses)
 */
import {
  CaptureDriver,
  SmtpDriver,
  type MailDriver,
  type SmtpConfig,
} from "@trilleo/mail/server";
import { addressOf, formatAddress, normalizeEmail } from "@trilleo/mail";
import { SITE_NAME } from "../site";

export const DEFAULT_FROM = formatAddress(
  SITE_NAME,
  "no-reply@automail.trilleo.net",
);

export interface MailConfig {
  transport: { kind: "smtp"; smtp: SmtpConfig } | { kind: "capture" };
  from: string;
  replyTo: string | null;
  adminTo: string[];
  /** Whether a message can actually reach someone (or be read here, in dev/e2e). */
  available: boolean;
  /** Why mail isn't working, for the admin. */
  problem: string | null;
}

type Env = Record<string, string | undefined>;

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}

function addressList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((part) => normalizeEmail(part))
    .filter((address): address is string => address !== null);
}

export function resolveMailConfig(env: Env, isDev: boolean): MailConfig {
  const from = nonEmpty(env.MAIL_FROM) ?? DEFAULT_FROM;
  const replyToRaw = nonEmpty(env.MAIL_REPLY_TO);
  const replyTo = replyToRaw ? normalizeEmail(replyToRaw) : null;
  const shared = { from, replyTo, adminTo: addressList(env.MAIL_ADMIN_TO) };
  const problems: string[] = [];
  if (/[\r\n]/.test(from) || normalizeEmail(addressOf(from)) === null)
    problems.push("MAIL_FROM isn’t a valid address.");
  if (replyToRaw && !replyTo)
    problems.push("MAIL_REPLY_TO isn’t a valid address.");

  const host = nonEmpty(env.SMTP_HOST);
  if (host) {
    const user = nonEmpty(env.SMTP_USER);
    const password = env.SMTP_PASSWORD ?? "";
    const port = Number(nonEmpty(env.SMTP_PORT) ?? "465");
    if (!user || password === "")
      problems.push(
        "SMTP_HOST is set, but SMTP_USER or SMTP_PASSWORD is missing.",
      );
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      problems.push("SMTP_PORT isn’t a port number.");
    if (problems.length === 0 && user)
      return {
        ...shared,
        transport: { kind: "smtp", smtp: { host, port, user, password } },
        available: true,
        problem: null,
      };
    return {
      ...shared,
      transport: { kind: "capture" },
      available: false,
      problem: problems.join(" "),
    };
  }
  const capture = env.MAIL_CAPTURE === "1" || isDev;
  return {
    ...shared,
    transport: { kind: "capture" },
    available: capture && problems.length === 0,
    problem:
      problems.length > 0
        ? problems.join(" ")
        : capture
          ? null
          : "Mail isn’t set up: SMTP_HOST is empty (deploy/mail.md).",
  };
}

export function createMailDriver(
  config: MailConfig,
  logCaptured?: (line: string) => void,
): MailDriver {
  return config.transport.kind === "smtp"
    ? new SmtpDriver(config.transport.smtp)
    : new CaptureDriver(logCaptured);
}

let cached: { config: MailConfig; driver: MailDriver } | undefined;

/** This server's mail settings and driver. The environment doesn't change while it runs. */
export function mailSetup(): { config: MailConfig; driver: MailDriver } {
  if (!cached) {
    const config = resolveMailConfig(process.env, import.meta.env.DEV);
    if (
      config.problem &&
      config.transport.kind === "capture" &&
      !import.meta.env.DEV
    )
      console.warn(`Mail: ${config.problem}`);
    // In `pnpm dev`, captured mail is also logged (sign-in codes are in subjects).
    cached = {
      config,
      driver: createMailDriver(
        config,
        import.meta.env.DEV
          ? (line) => {
              console.info(line);
            }
          : undefined,
      ),
    };
  }
  return cached;
}
