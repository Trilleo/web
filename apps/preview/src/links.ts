/**
 * Links people paste: share pages (GitHub, Dropbox, Google Drive…) turned into the
 * file behind them, and the rules both the browser and the server's fetch follow.
 * Pure, so the server can import it (`@trilleo/tool-preview/links`).
 */

/** The biggest file the tool previews, from a link or from this device. */
export const MAX_PREVIEW_BYTES = 50 * 1000 * 1000;

/** Links longer than this are refused (no real document address is this long). */
export const MAX_URL_LENGTH = 4096;

export interface ResolvedLink {
  /** Where to fetch the file. */
  url: string;
  /** The page it came from, when it was rewritten ("GitHub file"). */
  rewrittenFrom: string | null;
  /** The address as typed (normalised), for sharing and the Microsoft viewer. */
  original: string;
}

export type LinkProblem = "empty" | "invalid" | "protocol" | "too-long";

export const LINK_PROBLEMS: Readonly<Record<LinkProblem, string>> = {
  empty: "Paste a link to a document.",
  invalid: "That doesn't look like a web address.",
  protocol: "Only http:// and https:// links can be previewed.",
  "too-long": "That link is too long.",
};

/**
 * Reads what someone typed as a web address. A missing scheme means https
 * ("example.com/a.pdf").
 */
export function parseLink(input: string): URL | LinkProblem {
  const text = input.trim();
  if (!text) return "empty";
  if (text.length > MAX_URL_LENGTH) return "too-long";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
    ? text
    : `https://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return "invalid";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "protocol";
  if (!url.hostname) return "invalid";
  // Credentials in a link would be sent on; nobody should paste them here.
  url.username = "";
  url.password = "";
  return url;
}

interface Rewrite {
  label: string;
  rewrite: (url: URL) => string | null;
}

const host = (url: URL, ...names: string[]) =>
  names.includes(url.hostname.toLowerCase());

/** Share pages whose file sits at a predictable address. First match wins. */
const REWRITES: readonly Rewrite[] = [
  {
    // github.com/<owner>/<repo>/blob/<ref>/<path> → raw.githubusercontent.com
    label: "GitHub file",
    rewrite: (url) => {
      if (!host(url, "github.com", "www.github.com")) return null;
      const match = /^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/.exec(
        url.pathname,
      );
      if (!match) return null;
      const [, owner = "", repo = "", rest = ""] = match;
      return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
    },
  },
  {
    // gist.github.com/<user>/<id> → its raw text (the first file).
    label: "GitHub gist",
    rewrite: (url) => {
      if (!host(url, "gist.github.com")) return null;
      const match = /^\/([^/]+)\/([0-9a-f]+)\/?$/i.exec(url.pathname);
      if (!match) return null;
      const [, user = "", id = ""] = match;
      return `https://gist.githubusercontent.com/${user}/${id}/raw`;
    },
  },
  {
    // gitlab.com/<group>/<project>/-/blob/<ref>/<path> → /-/raw/
    label: "GitLab file",
    rewrite: (url) => {
      if (!host(url, "gitlab.com")) return null;
      if (!url.pathname.includes("/-/blob/")) return null;
      return `https://gitlab.com${url.pathname.replace("/-/blob/", "/-/raw/")}`;
    },
  },
  {
    // bitbucket.org/<workspace>/<repo>/src/<ref>/<path> → /raw/
    label: "Bitbucket file",
    rewrite: (url) => {
      if (!host(url, "bitbucket.org")) return null;
      const match = /^\/([^/]+)\/([^/]+)\/src\/(.+)$/.exec(url.pathname);
      if (!match) return null;
      const [, workspace = "", repo = "", rest = ""] = match;
      return `https://bitbucket.org/${workspace}/${repo}/raw/${rest}`;
    },
  },
  {
    // Dropbox share links: dl=1 asks for the file instead of the page.
    label: "Dropbox link",
    rewrite: (url) => {
      if (!host(url, "www.dropbox.com", "dropbox.com")) return null;
      if (!/^\/(s|sh|scl)\//.test(url.pathname)) return null;
      const next = new URL(url);
      next.hostname = "www.dropbox.com";
      next.searchParams.delete("raw");
      next.searchParams.set("dl", "1");
      return next.href;
    },
  },
  {
    // Google Docs, Sheets and Slides: their export as an Office file (or PDF).
    label: "Google document",
    rewrite: (url) => {
      if (!host(url, "docs.google.com")) return null;
      const match =
        /^\/(document|spreadsheets|presentation)\/d\/([A-Za-z0-9_-]+)/.exec(
          url.pathname,
        );
      if (!match) return null;
      const [, kind = "", id = ""] = match;
      const format =
        kind === "document"
          ? "docx"
          : kind === "spreadsheets"
            ? "xlsx"
            : "pptx";
      return `https://docs.google.com/${kind}/d/${id}/export?format=${format}`;
    },
  },
  {
    // drive.google.com/file/d/<id>/view or open?id=<id> → the download address.
    label: "Google Drive file",
    rewrite: (url) => {
      if (!host(url, "drive.google.com")) return null;
      const id =
        /^\/file\/d\/([A-Za-z0-9_-]+)/.exec(url.pathname)?.[1] ??
        (url.pathname === "/open" || url.pathname === "/uc"
          ? url.searchParams.get("id")
          : null);
      if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
      return `https://drive.usercontent.google.com/download?id=${id}&export=download`;
    },
  },
  {
    // OneDrive personal share links (1drv.ms or onedrive.live.com): download=1.
    label: "OneDrive link",
    rewrite: (url) => {
      if (host(url, "1drv.ms")) {
        const next = new URL(url);
        next.searchParams.set("download", "1");
        return next.href;
      }
      if (!host(url, "onedrive.live.com")) return null;
      if (url.pathname === "/download") return null;
      const next = new URL(url);
      if (url.pathname === "/redir" || url.pathname === "/embed") {
        next.pathname = "/download";
        return next.href;
      }
      return null;
    },
  },
];

/** Where to fetch a link's file from, rewriting share pages it recognises. */
export function resolveLink(url: URL): ResolvedLink {
  const original = url.href;
  for (const { label, rewrite } of REWRITES) {
    const next = rewrite(url);
    if (next && next !== original)
      return { url: next, rewrittenFrom: label, original };
  }
  return { url: original, rewrittenFrom: null, original };
}

/** A file name from a link's last path segment ("report.pdf"), if it has one. */
export function nameFromUrl(href: string): string | null {
  try {
    const url = new URL(href);
    const last = url.pathname.split("/").filter(Boolean).pop();
    if (!last) return null;
    const name = decodeURIComponent(last);
    return name.includes(".") ? name : null;
  } catch {
    return null;
  }
}

/**
 * The file name a Content-Disposition header gives (`filename*=UTF-8''…` first),
 * or null.
 */
export function nameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
  if (star?.[2]) {
    try {
      return decodeURIComponent(star[2].trim());
    } catch {
      // Fall through to the plain parameter.
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header);
  const name = (plain?.[2] ?? plain?.[1] ?? "").trim();
  return name || null;
}

/** Office files Microsoft's online viewer can show (by extension). */
export const MICROSOFT_VIEWER_EXTENSIONS = [
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
] as const;

/** Microsoft's viewer for a public link to an Office file. */
export function microsoftViewerUrl(fileUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}
