/**
 * Turns an email's content into its two parts: plain text, and a small HTML
 * version in the site's style. Email clients ignore stylesheets and CSS variables,
 * so the HTML is tables and inline styles, and the theme's colours are written out
 * here as hex (light theme only: clients that darken mail do it themselves).
 * No images, no web fonts, no tracking: nothing loads from anywhere.
 */

/** The theme's light colours (packages/ui/src/styles/theme.css). */
export const EMAIL_COLORS = {
  paper: "#f2f2ee",
  ink: "#0e0e0e",
  muted: "#5c5c57",
  hair: "#cfcfc8",
  chip: "#e4e4de",
  accent: "#e5470f",
  /** Dark text on the accent: orange text on paper is too faint. */
  onAccent: "#0e0e0e",
} as const;

const SANS =
  "'Schibsted Grotesk', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO =
  "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export type EmailBlock =
  /** A paragraph. */
  | { type: "text"; text: string }
  /** Someone else's words (a comment, a reason), set off with a rule. */
  | { type: "quote"; text: string }
  /** A code to type: large, spaced, monospaced. */
  | { type: "code"; text: string }
  /** The one thing to do next. */
  | { type: "button"; label: string; href: string }
  /** Label / value rows (a file's name, a project's state). */
  | { type: "facts"; rows: readonly (readonly [string, string])[] }
  /** A list of lines, each optionally a link. */
  | { type: "list"; items: readonly { text: string; href?: string }[] };

export interface EmailContent {
  /** Shown by inboxes after the subject; hidden in the message itself. */
  preheader?: string;
  /** The small label above the title, like the site's "(Account)". */
  label: string;
  title: string;
  blocks: readonly EmailBlock[];
  /** Why they got this, and how to stop it. */
  footer: readonly string[];
  footerLinks?: readonly { label: string; href: string }[];
}

export interface RenderedEmail {
  text: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) links are written into the HTML; anything else becomes text. */
function safeHref(href: string): string | null {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Keeps line breaks the writer typed (comments, replies, reasons). */
function multiline(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

/** Wraps long text at ~72 columns for the plain part (quotes keep their prefix). */
function wrap(text: string, prefix = ""): string {
  const width = 72 - prefix.length;
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      if (line && line.length + 1 + word.length > width) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  return lines.map((line) => `${prefix}${line}`.trimEnd()).join("\n");
}

function blockText(block: EmailBlock): string {
  switch (block.type) {
    case "text":
      return wrap(block.text);
    case "quote":
      return wrap(block.text, "> ");
    case "code":
      return `    ${block.text}`;
    case "button":
      return `${block.label}:\n${block.href}`;
    case "facts":
      return block.rows
        .map(([label, value]) => `${label}: ${value}`)
        .join("\n");
    case "list":
      return block.items
        .map((item) =>
          item.href ? `- ${item.text}\n  ${item.href}` : `- ${item.text}`,
        )
        .join("\n");
  }
}

const P = `margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.5;color:${EMAIL_COLORS.ink};`;

function blockHtml(block: EmailBlock): string {
  switch (block.type) {
    case "text":
      return `<p style="${P}">${multiline(block.text)}</p>`;
    case "quote":
      return `<blockquote style="margin:0 0 16px;padding:4px 0 4px 14px;border-left:2px solid ${EMAIL_COLORS.accent};font-family:${SANS};font-size:16px;line-height:1.5;color:${EMAIL_COLORS.ink};">${multiline(block.text)}</blockquote>`;
    case "code":
      return `<p style="margin:0 0 16px;font-family:${MONO};font-size:32px;line-height:1.2;letter-spacing:6px;font-weight:600;color:${EMAIL_COLORS.ink};">${escapeHtml(block.text)}</p>`;
    case "button": {
      const href = safeHref(block.href);
      if (!href) return `<p style="${P}">${escapeHtml(block.label)}</p>`;
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:${EMAIL_COLORS.accent};"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;font-family:${SANS};font-size:16px;font-weight:600;color:${EMAIL_COLORS.onAccent};text-decoration:none;">${escapeHtml(block.label)} &rarr;</a></td></tr></table>`;
    }
    case "facts":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px;border-top:1px solid ${EMAIL_COLORS.hair};">${block.rows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:8px 12px 8px 0;border-bottom:1px solid ${EMAIL_COLORS.hair};font-family:${MONO};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:${EMAIL_COLORS.muted};vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:8px 0;border-bottom:1px solid ${EMAIL_COLORS.hair};font-family:${SANS};font-size:15px;line-height:1.4;color:${EMAIL_COLORS.ink};">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`;
    case "list":
      return `<ul style="margin:0 0 16px;padding:0 0 0 20px;font-family:${SANS};font-size:16px;line-height:1.5;color:${EMAIL_COLORS.ink};">${block.items
        .map((item) => {
          const href = item.href ? safeHref(item.href) : null;
          return `<li style="margin:0 0 6px;">${
            href
              ? `<a href="${escapeHtml(href)}" style="color:${EMAIL_COLORS.ink};">${escapeHtml(item.text)}</a>`
              : escapeHtml(item.text)
          }</li>`;
        })
        .join("")}</ul>`;
  }
}

export function renderEmail(content: EmailContent): RenderedEmail {
  const links = content.footerLinks ?? [];
  const text = [
    content.title,
    "",
    ...content.blocks.map((block) => `${blockText(block)}\n`),
    "--",
    ...content.footer.map((line) => wrap(line)),
    ...links.map((link) => `${link.label}: ${link.href}`),
    "",
  ].join("\n");

  const footerLinks = links
    .map((link) => {
      const href = safeHref(link.href);
      return href
        ? `<a href="${escapeHtml(href)}" style="color:${EMAIL_COLORS.muted};">${escapeHtml(link.label)}</a>`
        : escapeHtml(link.label);
    })
    .join(" &middot; ");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.paper};">
${content.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(content.preheader)}</div>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${EMAIL_COLORS.paper};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
<tr><td style="padding:0 0 12px;border-bottom:1px solid ${EMAIL_COLORS.ink};font-family:${MONO};font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:${EMAIL_COLORS.ink};"><span style="display:inline-block;width:8px;height:8px;background:${EMAIL_COLORS.accent};margin-right:8px;"></span>Trilleo &nbsp;<span style="color:${EMAIL_COLORS.muted};">(${escapeHtml(content.label)})</span></td></tr>
<tr><td style="padding:24px 0 8px;">
<h1 style="margin:0 0 20px;font-family:${SANS};font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.5px;color:${EMAIL_COLORS.ink};">${escapeHtml(content.title)}</h1>
${content.blocks.map(blockHtml).join("\n")}
</td></tr>
<tr><td style="padding:16px 0 0;border-top:1px solid ${EMAIL_COLORS.hair};font-family:${SANS};font-size:13px;line-height:1.5;color:${EMAIL_COLORS.muted};">
${content.footer.map((line) => `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>`).join("\n")}
${footerLinks ? `<p style="margin:0;">${footerLinks}</p>` : ""}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;
  return { text, html };
}
