/**
 * The Preview tool's fallback (POST /api/tools/preview/fetch): fetches a document
 * for a browser when the document's site doesn't let browsers read it (CORS), and
 * streams it straight through. Nothing is stored; the request isn't logged.
 *
 * It fetches addresses strangers type, so it must never reach anything that isn't on
 * the public internet (SSRF):
 *   - only http(s), only ports 80 and 443;
 *   - every address a name resolves to must be public (no loopback, private, link-local,
 *     carrier-grade NAT, documentation, multicast or reserved ranges), and the
 *     connection goes to the address that was checked (the check is the socket's own
 *     DNS lookup, so the name can't be re-pointed in between);
 *   - redirects are followed by hand, at most PREVIEW_FETCH_LIMITS.maxRedirects, each
 *     checked the same way;
 *   - a size limit, timeouts, and per-visitor and daily limits.
 * What it returns is always application/octet-stream with `nosniff`, a sandbox CSP and
 * `attachment`, so a fetched page can never run as this site.
 */
import { createHash } from "node:crypto";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import zlib from "node:zlib";
import {
  MAX_PREVIEW_BYTES,
  MAX_URL_LENGTH,
  nameFromDisposition,
} from "@trilleo/tool-preview/links";

export const PREVIEW_FETCH_LIMITS = {
  maxBytes: MAX_PREVIEW_BYTES,
  maxRedirects: 5,
  /** Until the site starts answering. */
  headersTimeoutMs: 15_000,
  /** For the whole file. */
  totalTimeoutMs: 90_000,
  /** Fetches per visitor (a hash of their IP, in memory) per hour. */
  perVisitorHourly: 30,
  /** Bytes the server passes on per UTC day, for everyone together. */
  dailyBytes: 5 * 1000 * 1000 * 1000,
} as const;

const HOUR_MS = 60 * 60 * 1000;

export type PreviewFetchError =
  | "invalid-url"
  | "blocked-address"
  | "blocked-port"
  | "unreachable"
  | "timeout"
  | "upstream-status"
  | "too-big"
  | "too-many-redirects"
  | "rate-limited"
  | "busy";

export const PREVIEW_FETCH_ERRORS: Readonly<
  Record<PreviewFetchError, { status: number; message: string }>
> = {
  "invalid-url": {
    status: 400,
    message: "That doesn't look like an http:// or https:// address.",
  },
  "blocked-address": {
    status: 403,
    message:
      "That address is on a private network, so this site won't fetch it.",
  },
  "blocked-port": {
    status: 403,
    message:
      "Only links on the usual web ports (80 and 443) can be fetched through this site.",
  },
  unreachable: {
    status: 502,
    message:
      "That site can't be reached from this site's server, which is in mainland China, where some services (Google, Dropbox, OneDrive and others) are blocked. If you can open the link yourself, download the file and drop it here instead.",
  },
  timeout: { status: 504, message: "The site took too long to answer." },
  "upstream-status": {
    status: 502,
    message: "The site answered with an error.",
  },
  "too-big": {
    status: 413,
    message: `This file is bigger than ${String(MAX_PREVIEW_BYTES / 1_000_000)} MB, the most this tool previews.`,
  },
  "too-many-redirects": {
    status: 502,
    message: "That link redirects too many times.",
  },
  "rate-limited": {
    status: 429,
    message: "Too many previews from here for now. Try again in a while.",
  },
  busy: {
    status: 503,
    message:
      "This site has fetched all it can for today. Download the file and drop it here instead, or try again tomorrow.",
  },
};

// Everything that isn't the public internet. IPv4-mapped, NAT64, 6to4 and Teredo
// addresses can carry an IPv4 address inside, so they're refused whole.
const BLOCKED = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  BLOCKED.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8],
] as const)
  BLOCKED.addSubnet(network, prefix, "ipv6");

/**
 * The IPv4 address inside an IPv4-mapped IPv6 one ("::ffff:127.0.0.1"), or null.
 * (Node's BlockList matches IPv4 addresses against IPv6 rules for the mapped range,
 * so that range is handled here instead of in BLOCKED.)
 */
function mappedIpv4(address: string): string | null {
  let canonical: string;
  try {
    canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  } catch {
    return null;
  }
  const match = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
  if (!match) return null;
  const high = parseInt(match[1] ?? "0", 16);
  const low = parseInt(match[2] ?? "0", 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join(".");
}

/** Whether an IP address is on the public internet. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !BLOCKED.check(address, "ipv4");
  if (family === 6) {
    // A zone ("fe80::1%eth0") only exists on local links.
    if (address.includes("%")) return false;
    const inner = mappedIpv4(address);
    if (inner) return isPublicAddress(inner);
    return !BLOCKED.check(address, "ipv6");
  }
  return false;
}

/** Hosts e2e may fetch from despite the rules ("127.0.0.1:4331"), from PREVIEW_ALLOW_HOSTS. */
export function allowedHosts(
  env: Record<string, string | undefined> = process.env,
): ReadonlySet<string> {
  return new Set(
    (env.PREVIEW_ALLOW_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
}

class FetchProblem extends Error {
  constructor(
    readonly code: PreviewFetchError,
    readonly upstreamStatus?: number,
  ) {
    super(code);
  }
}

/** Checks an address before any connection: scheme, port, and literal IPs. */
export function checkTarget(
  raw: string,
  allowed: ReadonlySet<string>,
): URL | PreviewFetchError {
  if (raw.length > MAX_URL_LENGTH) return "invalid-url";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "invalid-url";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    return "invalid-url";
  if (url.username || url.password) return "invalid-url";
  if (allowed.has(url.host.toLowerCase())) return url;
  if (url.port && url.port !== "80" && url.port !== "443")
    return "blocked-port";
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(hostname))
    return isPublicAddress(hostname) ? url : "blocked-address";
  // Names that only mean something inside a network (single labels like a Docker
  // service's name, .local, .internal) never reach the lookup.
  if (
    !hostname.includes(".") ||
    hostname === "localhost" ||
    /\.(localhost|local|internal|lan|home\.arpa)$/.test(hostname)
  )
    return "blocked-address";
  return url;
}

/**
 * The socket's DNS lookup: resolves as usual, then refuses if any answer isn't
 * public. The socket connects to what this returns, so nothing can change in between.
 */
export function guardedLookup(
  resolve: typeof dnsLookup = dnsLookup,
): LookupFunction {
  return (hostname, options, callback) => {
    resolve(
      hostname,
      { all: true, verbatim: true, family: options.family ?? 0 },
      (error: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => {
        if (error) {
          callback(error, "", 0);
          return;
        }
        if (
          addresses.length === 0 ||
          addresses.some((entry) => !isPublicAddress(entry.address))
        ) {
          const refused: NodeJS.ErrnoException = new Error(
            `${hostname} resolves to an address that isn't public`,
          );
          refused.code = "EPREVIEWBLOCKED";
          callback(refused, "", 0);
          return;
        }
        if (options.all) {
          // Node's types only describe the single-address callback.
          (callback as unknown as (e: null, a: LookupAddress[]) => void)(
            null,
            addresses,
          );
          return;
        }
        const [first] = addresses;
        callback(null, first?.address ?? "", first?.family ?? 4);
      },
    );
  };
}

interface Upstream {
  response: http.IncomingMessage;
  url: URL;
}

const USER_AGENT =
  "TrilleoPreview/1.0 (+https://www.trilleo.net/tools/preview/)";

function requestOnce(
  url: URL,
  signal: AbortSignal,
  lookup: LookupFunction | undefined,
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
      },
      signal,
      ...(lookup ? { lookup } : {}),
    });
    const timer = setTimeout(() => {
      request.destroy(new FetchProblem("timeout"));
    }, PREVIEW_FETCH_LIMITS.headersTimeoutMs);
    request.on("response", (response) => {
      clearTimeout(timer);
      resolve(response);
    });
    request.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    request.end();
  });
}

/** Follows redirects by hand, checking each address. */
async function follow(
  start: URL,
  signal: AbortSignal,
  allowed: ReadonlySet<string>,
  resolve: typeof dnsLookup,
): Promise<Upstream> {
  let url = start;
  for (let hop = 0; ; hop++) {
    const permitted = allowed.has(url.host.toLowerCase());
    const response = await requestOnce(
      url,
      signal,
      permitted ? undefined : guardedLookup(resolve),
    );
    const status = response.statusCode ?? 0;
    const location = response.headers.location;
    if (status >= 300 && status < 400 && location) {
      response.resume();
      if (hop >= PREVIEW_FETCH_LIMITS.maxRedirects)
        throw new FetchProblem("too-many-redirects");
      let next: string;
      try {
        next = new URL(location, url).href;
      } catch {
        throw new FetchProblem("invalid-url");
      }
      const checked = checkTarget(next, allowed);
      if (typeof checked === "string") throw new FetchProblem(checked);
      url = checked;
      continue;
    }
    return { response, url };
  }
}

/** The error code for whatever a request threw. */
function problemOf(error: unknown, signal: AbortSignal): FetchProblem {
  if (error instanceof FetchProblem) return error;
  const code = (error as NodeJS.ErrnoException | null)?.code;
  if (code === "EPREVIEWBLOCKED") return new FetchProblem("blocked-address");
  if (signal.aborted || code === "ABORT_ERR" || code === "ETIMEDOUT")
    return new FetchProblem("timeout");
  return new FetchProblem("unreachable");
}

function decoded(response: http.IncomingMessage): Readable {
  switch (response.headers["content-encoding"]?.trim().toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return response.pipe(zlib.createGunzip());
    case "deflate":
      return response.pipe(zlib.createInflate());
    case "br":
      return response.pipe(zlib.createBrotliDecompress());
    default:
      return response;
  }
}

/** Header values must be plain ASCII; anything else is dropped. */
const asciiHeader = (value: string | undefined): string | null =>
  value && /^[\x20-\x7e]*$/.test(value) ? value.slice(0, 500) : null;

/**
 * Per-visitor fetch counts (by a hash of the IP, for an hour at most) and today's
 * bytes. In memory: a restart forgets them, which is fine for limits.
 */
export class PreviewLimits {
  private readonly fetches = new Map<string, number[]>();
  private day = "";
  private bytes = 0;

  constructor(private readonly maxVisitors = 10_000) {}

  static key(ip: string): string {
    return createHash("sha256").update(`preview\n${ip}`).digest("base64url");
  }

  /** Whether this visitor may fetch once more now; counts it if so. */
  take(key: string, now: Date): PreviewFetchError | null {
    this.rollDay(now);
    if (this.bytes >= PREVIEW_FETCH_LIMITS.dailyBytes) return "busy";
    const at = now.getTime();
    const recent = (this.fetches.get(key) ?? []).filter(
      (time) => at - time < HOUR_MS,
    );
    if (recent.length >= PREVIEW_FETCH_LIMITS.perVisitorHourly) {
      this.fetches.set(key, recent);
      return "rate-limited";
    }
    if (!this.fetches.has(key) && this.fetches.size >= this.maxVisitors)
      this.fetches.clear();
    this.fetches.set(key, [...recent, at]);
    return null;
  }

  /** Counts bytes passed on; false once today's allowance is used up. */
  addBytes(count: number, now: Date): boolean {
    this.rollDay(now);
    this.bytes += count;
    return this.bytes <= PREVIEW_FETCH_LIMITS.dailyBytes;
  }

  private rollDay(now: Date): void {
    const day = now.toISOString().slice(0, 10);
    if (day !== this.day) {
      this.day = day;
      this.bytes = 0;
    }
  }
}

export interface PreviewFetchDeps {
  limits: PreviewLimits;
  /** The visitor's IP, or "" when unknown (then everyone shares one limit). */
  ip: string;
  now?: () => Date;
  allowed?: ReadonlySet<string>;
  /** The incoming request's signal: the fetch stops when the visitor leaves. */
  signal?: AbortSignal;
  /** For tests. */
  resolve?: typeof dnsLookup;
}

export function errorResponse(
  code: PreviewFetchError,
  upstreamStatus?: number,
): Response {
  const { status, message } = PREVIEW_FETCH_ERRORS[code];
  const text =
    code === "upstream-status" && upstreamStatus
      ? upstreamStatus === 404 || upstreamStatus === 410
        ? "Nothing is at that link (the site says it's not found)."
        : upstreamStatus === 401 || upstreamStatus === 403
          ? "That site wants you signed in to see this file, so it can't be previewed here."
          : `The site answered with an error (${String(upstreamStatus)}).`
      : message;
  return new Response(JSON.stringify({ error: { code, message: text } }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}

/** Reads the request's `{ url }` body; null when it isn't one. */
export async function readTarget(request: Request): Promise<string | null> {
  const text = await request.text();
  if (text.length > MAX_URL_LENGTH + 100) return null;
  try {
    const body = JSON.parse(text) as { url?: unknown };
    return typeof body.url === "string" ? body.url : null;
  } catch {
    return null;
  }
}

/** Fetches `raw` for a visitor and streams it back, or answers with an error. */
export async function previewFetch(
  raw: string,
  deps: PreviewFetchDeps,
): Promise<Response> {
  const now = deps.now ?? (() => new Date());
  const allowed = deps.allowed ?? allowedHosts();
  const target = checkTarget(raw, allowed);
  if (typeof target === "string") return errorResponse(target);
  const refused = deps.limits.take(PreviewLimits.key(deps.ip), now());
  if (refused) return errorResponse(refused);

  const signal = AbortSignal.any([
    AbortSignal.timeout(PREVIEW_FETCH_LIMITS.totalTimeoutMs),
    ...(deps.signal ? [deps.signal] : []),
  ]);
  let upstream: Upstream;
  try {
    upstream = await follow(target, signal, allowed, deps.resolve ?? dnsLookup);
  } catch (error) {
    const problem = problemOf(error, signal);
    return errorResponse(problem.code);
  }
  const { response, url } = upstream;
  const status = response.statusCode ?? 0;
  if (status < 200 || status >= 300) {
    response.resume();
    return errorResponse("upstream-status", status);
  }
  const encoding = response.headers["content-encoding"];
  const length = Number(response.headers["content-length"] ?? "");
  if (Number.isFinite(length) && length > PREVIEW_FETCH_LIMITS.maxBytes) {
    response.destroy();
    return errorResponse("too-big");
  }

  const source = decoded(response);
  let sent = 0;
  const iterator = source[Symbol.asyncIterator]() as AsyncIterator<
    Buffer,
    undefined
  >;
  const stop = () => {
    response.destroy();
    source.destroy();
  };
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        // One byte past the limit still goes out, so the browser sees the file is too
        // big (and says so) before the stream ends.
        const room = PREVIEW_FETCH_LIMITS.maxBytes + 1 - sent;
        const chunk = value.byteLength > room ? value.subarray(0, room) : value;
        sent += chunk.byteLength;
        controller.enqueue(new Uint8Array(chunk));
        const underDaily = deps.limits.addBytes(chunk.byteLength, now());
        if (sent > PREVIEW_FETCH_LIMITS.maxBytes || !underDaily) {
          stop();
          controller.error(new Error("preview limit reached"));
        }
      } catch (error) {
        stop();
        controller.error(error);
      }
    },
    cancel() {
      stop();
    },
  });

  const name = nameFromDisposition(
    asciiHeader(response.headers["content-disposition"]),
  );
  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": "attachment",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex",
    "X-Preview-Url": url.href,
  });
  const type = asciiHeader(response.headers["content-type"]);
  if (type) headers.set("X-Preview-Type", type);
  if (name) headers.set("X-Preview-Name", encodeURIComponent(name));
  if (!encoding && Number.isFinite(length) && length > 0)
    headers.set("Content-Length", String(length));
  return new Response(body, { status: 200, headers });
}
