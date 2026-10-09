import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATIONS,
  EMAIL_MAX_LENGTH,
  MAIL_KINDS,
  addressOf,
  formatAddress,
  maskEmail,
  normalizeEmail,
  parseNotificationSettings,
  renderEmail,
} from ".";
import { CaptureDriver, MailError, checkHeaders } from "./driver";
import { isPermanentFailure, toMailError } from "./smtp";
import { RecordingDriver } from "./testing";

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(normalizeEmail("a.b+tag@sub.example.co.uk")).toBe(
      "a.b+tag@sub.example.co.uk",
    );
  });

  it.each([
    "",
    "no-at-sign",
    "@example.com",
    "ada@",
    "ada@localhost",
    "ada@exa_mple.com",
    "ada@-example.com",
    "ada@example-.com",
    "ada@example..com",
    ".ada@example.com",
    "ada.@example.com",
    "a..da@example.com",
    "a da@example.com",
    "ada@example.com\r\nBcc: x@example.com",
    "ada\n@example.com",
    "<ada@example.com>",
    "ada,bob@example.com",
    `${"a".repeat(65)}@example.com`,
    `ada@${"a".repeat(64)}.com`,
  ])("refuses %j", (input) => {
    expect(normalizeEmail(input)).toBeNull();
  });

  it("refuses addresses over the length limit quickly", () => {
    const long = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(60)}.${"d".repeat(63)}.com`;
    expect(long.length).toBeGreaterThan(EMAIL_MAX_LENGTH);
    expect(normalizeEmail(long)).toBeNull();
    const started = performance.now();
    normalizeEmail(`${"a".repeat(64)}@${"a-".repeat(90)}`);
    expect(performance.now() - started).toBeLessThan(50);
  });
});

describe("addresses in headers", () => {
  it("masks", () => {
    expect(maskEmail("ada@example.com")).toBe("a•••@example.com");
  });

  it("quotes names and strips what could break out", () => {
    expect(formatAddress("Trilleo", "no-reply@automail.trilleo.net")).toBe(
      '"Trilleo" <no-reply@automail.trilleo.net>',
    );
    expect(formatAddress('Ev"il\r\nBcc: x', "a@b.co")).toBe(
      '"EvilBcc: x" <a@b.co>',
    );
    expect(formatAddress(null, "a@b.co")).toBe("a@b.co");
    expect(addressOf('"Trilleo" <no-reply@automail.trilleo.net>')).toBe(
      "no-reply@automail.trilleo.net",
    );
    expect(addressOf("a@b.co")).toBe("a@b.co");
  });
});

describe("notification settings", () => {
  it("fills in defaults and ignores junk", () => {
    expect(parseNotificationSettings(null)).toEqual(DEFAULT_NOTIFICATIONS);
    expect(
      parseNotificationSettings({ replies: false, reviews: "no", extra: true }),
    ).toEqual({ ...DEFAULT_NOTIFICATIONS, replies: false });
  });

  it("only codes and undo links are secret, and only notifications can be switched off", () => {
    const secret = Object.entries(MAIL_KINDS)
      .filter(([, kind]) => kind.secret)
      .map(([name]) => name);
    expect(secret).toEqual(["email-code", "email-changed"]);
    expect(MAIL_KINDS["email-code"].topic).toBeNull();
    expect(MAIL_KINDS["email-changed"].topic).toBeNull();
    expect(MAIL_KINDS["new-sign-in"].topic).toBe("security");
    expect(MAIL_KINDS["comment-reply"].topic).toBe("replies");
  });
});

describe("renderEmail", () => {
  const email = renderEmail({
    preheader: "Your code is 123456",
    label: "Account",
    title: "Confirm <your> address",
    blocks: [
      { type: "text", text: "Line one\nline two & more" },
      { type: "code", text: "123456" },
      { type: "quote", text: "<script>alert(1)</script>" },
      {
        type: "button",
        label: "Open",
        href: "https://www.trilleo.net/account/",
      },
      { type: "button", label: "Bad", href: "javascript:alert(1)" },
      { type: "facts", rows: [["File", "a<b>.png"]] },
      {
        type: "list",
        items: [
          { text: "One", href: "https://www.trilleo.net/a" },
          { text: "Two" },
        ],
      },
    ],
    footer: ["You get this because you asked."],
    footerLinks: [
      { label: "Settings", href: "https://www.trilleo.net/account/email/" },
    ],
  });

  it("escapes everything in the HTML", () => {
    expect(email.html).toContain("Confirm &lt;your&gt; address");
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("javascript:");
    expect(email.html).toContain("Line one<br>line two &amp; more");
    expect(email.html).toContain('href="https://www.trilleo.net/account/"');
    expect(email.html).toContain("a&lt;b&gt;.png");
  });

  it("writes a readable plain part", () => {
    expect(email.text).toContain("Confirm <your> address");
    expect(email.text).toContain("    123456");
    expect(email.text).toContain("> <script>alert(1)</script>");
    expect(email.text).toContain("Open:\nhttps://www.trilleo.net/account/");
    expect(email.text).toContain("File: a<b>.png");
    expect(email.text).toContain("- One\n  https://www.trilleo.net/a");
    expect(email.text).toContain(
      "Settings: https://www.trilleo.net/account/email/",
    );
  });

  it("wraps long paragraphs", () => {
    const { text } = renderEmail({
      label: "x",
      title: "t",
      blocks: [{ type: "text", text: "word ".repeat(40).trim() }],
      footer: [],
    });
    for (const line of text.split("\n"))
      expect(line.length).toBeLessThanOrEqual(72);
  });
});

describe("drivers", () => {
  const mail = {
    from: "a@b.co",
    to: "c@d.co",
    subject: "Hi",
    text: "Hello",
  };

  it("refuses headers with line breaks", () => {
    expect(() => {
      checkHeaders({ ...mail, subject: "Hi\r\nBcc: x@y.z" });
    }).toThrow(MailError);
    expect(() => {
      checkHeaders({ ...mail, headers: { "X-A": "1\n2" } });
    }).toThrow(MailError);
    expect(() => {
      checkHeaders(mail);
    }).not.toThrow();
  });

  it("capture sends nothing", async () => {
    await expect(new CaptureDriver().send()).resolves.toEqual({
      messageId: null,
    });
  });

  it("capture can log what it kept (for pnpm dev)", async () => {
    const lines: string[] = [];
    await new CaptureDriver((line) => lines.push(line)).send(mail);
    expect(lines).toEqual([`Mail captured for ${mail.to}: ${mail.subject}`]);
  });

  it("the recording driver records and fails on demand", async () => {
    const driver = new RecordingDriver().failNext("down");
    await expect(driver.send(mail)).rejects.toThrow("down");
    await driver.send(mail);
    expect(driver.sent).toHaveLength(1);
  });

  it("tells permanent SMTP failures from passing ones", () => {
    expect(isPermanentFailure({ responseCode: 550 })).toBe(true);
    expect(isPermanentFailure({ responseCode: 421 })).toBe(false);
    expect(isPermanentFailure({ code: "EAUTH", responseCode: 535 })).toBe(
      false,
    );
    expect(isPermanentFailure({ code: "ETIMEDOUT" })).toBe(false);
    expect(isPermanentFailure({ code: "EENVELOPE" })).toBe(true);
    const error = toMailError(
      Object.assign(new Error("550 no such user"), {
        code: "EENVELOPE",
        responseCode: 550,
      }),
    );
    expect(error.permanent).toBe(true);
    expect(error.code).toBe("EENVELOPE");
    expect(toMailError("weird").message).toBe("weird");
  });
});
