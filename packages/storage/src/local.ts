/**
 * Storage without a cloud: objects in a folder (`pnpm dev`) or in memory (tests,
 * e2e). It mimics OBS closely enough that the site's code can't tell: multipart
 * uploads, signed part URLs the browser PUTs to, public and private objects.
 * The site serves its URLs from one route (`handle`), which exists only while this
 * driver is in use.
 */
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { contentDisposition, type ServeHeaders } from "./files";
import {
  StorageError,
  type ObjectInfo,
  type StorageDriver,
  type UploadedPart,
} from "./driver";

/** Named blobs: a Map, or files under a folder. */
interface Blobs {
  get(name: string): Promise<Uint8Array | null>;
  put(name: string, bytes: Uint8Array): Promise<void>;
  delete(name: string): Promise<void>;
  /** Names starting with `prefix`. */
  list(prefix: string): Promise<string[]>;
}

function memoryBlobs(): Blobs {
  const map = new Map<string, Uint8Array>();
  return {
    get: (name) => Promise.resolve(map.get(name) ?? null),
    put: (name, bytes) => {
      map.set(name, bytes);
      return Promise.resolve();
    },
    delete: (name) => {
      map.delete(name);
      return Promise.resolve();
    },
    list: (prefix) =>
      Promise.resolve(
        [...map.keys()].filter((name) => name.startsWith(prefix)),
      ),
  };
}

function folderBlobs(root: string): Blobs {
  const base = resolve(root);
  const path = (name: string) => {
    const full = resolve(base, name);
    // Names come from keys the site made, but never let one escape the folder.
    if (!full.startsWith(base + sep)) throw new Error(`Bad blob name: ${name}`);
    return full;
  };
  return {
    async get(name) {
      try {
        return new Uint8Array(await readFile(path(name)));
      } catch {
        return null;
      }
    },
    async put(name, bytes) {
      const full = path(name);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, bytes);
    },
    async delete(name) {
      await rm(path(name), { force: true });
    },
    async list(prefix) {
      // Every name the site uses has a folder part ("uploads/<id>/part-").
      const folder = prefix.slice(0, prefix.lastIndexOf("/") + 1);
      try {
        const names = await readdir(path(folder), { recursive: true });
        return names
          .map((name) => folder + name.split(sep).join("/"))
          .filter((name) => name.startsWith(prefix));
      } catch {
        return [];
      }
    },
  };
}

interface ObjectMeta {
  headers: ServeHeaders;
  public: boolean;
}

interface UploadMeta {
  key: string;
  headers: ServeHeaders;
}

type Grant =
  | { op: "part"; key: string; uploadId: string; part: number; exp: number }
  | { op: "get"; key: string; filename?: string; exp: number };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface LocalDriverOptions {
  /** A folder to keep objects in, or null for memory. */
  root: string | null;
  /** Where the site serves `handle` (no trailing slash), e.g. "/api/storage/local". */
  baseUrl: string;
  /** Signs URLs. Random per process by default (old URLs stop working on restart). */
  secret?: Uint8Array;
  /** For tests: the clock, in ms. */
  now?: () => number;
}

export class LocalDriver implements StorageDriver {
  readonly kind = "local";
  private readonly blobs: Blobs;
  private readonly baseUrl: string;
  private readonly secret: Uint8Array;
  private readonly now: () => number;

  constructor(options: LocalDriverOptions) {
    this.blobs =
      options.root === null ? memoryBlobs() : folderBlobs(options.root);
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.secret = options.secret ?? randomBytes(32);
    this.now = options.now ?? Date.now;
  }

  private sign(grant: Grant): string {
    const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
    const mac = createHmac("sha256", this.secret)
      .update(payload)
      .digest("base64url");
    return `${payload}.${mac}`;
  }

  private verify(token: string): Grant | null {
    const [payload, mac] = token.split(".");
    if (!payload || !mac) return null;
    const expected = createHmac("sha256", this.secret).update(payload).digest();
    const given = Buffer.from(mac, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      return null;
    const grant = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Grant;
    return grant.exp >= this.now() ? grant : null;
  }

  private async uploadMeta(uploadId: string): Promise<UploadMeta | null> {
    if (!/^[a-f0-9]{32}$/.test(uploadId)) return null;
    const bytes = await this.blobs.get(`uploads/${uploadId}/meta`);
    return bytes ? (JSON.parse(decoder.decode(bytes)) as UploadMeta) : null;
  }

  private async objectMeta(key: string): Promise<ObjectMeta | null> {
    const bytes = await this.blobs.get(`meta/${key}`);
    return bytes ? (JSON.parse(decoder.decode(bytes)) as ObjectMeta) : null;
  }

  async startUpload(key: string, headers: ServeHeaders): Promise<string> {
    const uploadId = randomBytes(16).toString("hex");
    const meta: UploadMeta = { key, headers };
    await this.blobs.put(
      `uploads/${uploadId}/meta`,
      encoder.encode(JSON.stringify(meta)),
    );
    return uploadId;
  }

  partUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn: number,
  ): Promise<string> {
    const token = this.sign({
      op: "part",
      key,
      uploadId,
      part: partNumber,
      exp: this.now() + expiresIn * 1000,
    });
    return Promise.resolve(`${this.baseUrl}/${token}`);
  }

  /** Stores a part, as a PUT to a part URL would. Returns its ETag. */
  async putPart(
    uploadId: string,
    partNumber: number,
    bytes: Uint8Array,
  ): Promise<string> {
    if (!(await this.uploadMeta(uploadId)))
      throw new StorageError("No such upload", 404, "NoSuchUpload");
    await this.blobs.put(
      `uploads/${uploadId}/part-${String(partNumber)}`,
      bytes,
    );
    return `"${createHash("md5").update(bytes).digest("hex")}"`;
  }

  async listParts(key: string, uploadId: string): Promise<UploadedPart[]> {
    const meta = await this.uploadMeta(uploadId);
    if (meta?.key !== key)
      throw new StorageError("No such upload", 404, "NoSuchUpload");
    const parts: UploadedPart[] = [];
    for (const name of await this.blobs.list(`uploads/${uploadId}/part-`)) {
      const bytes = await this.blobs.get(name);
      if (!bytes) continue;
      parts.push({
        partNumber: Number(name.split("part-")[1]),
        etag: `"${createHash("md5").update(bytes).digest("hex")}"`,
        size: bytes.length,
      });
    }
    return parts.sort((a, b) => a.partNumber - b.partNumber);
  }

  async finishUpload(
    key: string,
    uploadId: string,
    parts: readonly UploadedPart[],
  ): Promise<void> {
    const meta = await this.uploadMeta(uploadId);
    if (meta?.key !== key)
      throw new StorageError("No such upload", 404, "NoSuchUpload");
    const chunks: Uint8Array[] = [];
    for (const part of parts) {
      const bytes = await this.blobs.get(
        `uploads/${uploadId}/part-${String(part.partNumber)}`,
      );
      if (!bytes)
        throw new StorageError("A part is missing", 400, "InvalidPart");
      chunks.push(bytes);
    }
    await this.blobs.put(
      `objects/${key}`,
      new Uint8Array(Buffer.concat(chunks)),
    );
    const objectMeta: ObjectMeta = { headers: meta.headers, public: false };
    await this.blobs.put(
      `meta/${key}`,
      encoder.encode(JSON.stringify(objectMeta)),
    );
    await this.abortUpload(key, uploadId);
  }

  async abortUpload(_key: string, uploadId: string): Promise<void> {
    if (!/^[a-f0-9]{32}$/.test(uploadId)) return;
    for (const name of await this.blobs.list(`uploads/${uploadId}/`)) {
      await this.blobs.delete(name);
    }
  }

  async put(
    key: string,
    bytes: Uint8Array,
    headers: ServeHeaders,
  ): Promise<void> {
    await this.blobs.put(`objects/${key}`, new Uint8Array(bytes));
    const meta: ObjectMeta = { headers, public: false };
    await this.blobs.put(`meta/${key}`, encoder.encode(JSON.stringify(meta)));
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const [bytes, meta] = await Promise.all([
      this.blobs.get(`objects/${key}`),
      this.objectMeta(key),
    ]);
    if (!bytes || !meta) return null;
    return { size: bytes.length, contentType: meta.headers.contentType };
  }

  async read(
    key: string,
    range?: { start: number; end: number },
  ): Promise<ReadableStream<Uint8Array>> {
    const bytes = await this.blobs.get(`objects/${key}`);
    if (!bytes) throw new StorageError("No such object", 404, "NoSuchKey");
    const slice = range ? bytes.subarray(range.start, range.end) : bytes;
    return new Blob([new Uint8Array(slice)]).stream();
  }

  async setPublic(key: string, isPublic: boolean): Promise<void> {
    const meta = await this.objectMeta(key);
    if (!meta) throw new StorageError("No such object", 404, "NoSuchKey");
    await this.blobs.put(
      `meta/${key}`,
      encoder.encode(JSON.stringify({ ...meta, public: isPublic })),
    );
  }

  async remove(key: string): Promise<void> {
    await this.blobs.delete(`objects/${key}`);
    await this.blobs.delete(`meta/${key}`);
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/public/${key}`;
  }

  signedUrl(
    key: string,
    expiresIn: number,
    options: { filename?: string } = {},
  ): Promise<string> {
    const token = this.sign({
      op: "get",
      key,
      ...(options.filename ? { filename: options.filename } : {}),
      exp: this.now() + expiresIn * 1000,
    });
    return Promise.resolve(`${this.baseUrl}/${token}`);
  }

  /**
   * Answers a request to one of this driver's URLs. `path` is what follows the base
   * URL: `public/<key>` (GET a public object) or a signed token (PUT a part, GET a
   * private object).
   */
  async handle(request: Request, path: string): Promise<Response> {
    if (path.startsWith("public/")) {
      if (request.method !== "GET" && request.method !== "HEAD")
        return text(405, "Method not allowed");
      const key = path.slice("public/".length);
      const meta = await this.objectMeta(key);
      if (!meta?.public) return text(404, "Not found");
      return this.serve(key, meta.headers, request.method === "HEAD");
    }

    const grant = this.verify(path);
    if (!grant) return text(403, "This link has expired or isn't valid.");
    if (grant.op === "part") {
      if (request.method !== "PUT") return text(405, "Method not allowed");
      try {
        const etag = await this.putPart(
          grant.uploadId,
          grant.part,
          new Uint8Array(await request.arrayBuffer()),
        );
        return new Response(null, { status: 200, headers: { ETag: etag } });
      } catch (error) {
        if (error instanceof StorageError)
          return text(error.status, error.message);
        throw error;
      }
    }
    if (request.method !== "GET" && request.method !== "HEAD")
      return text(405, "Method not allowed");
    const meta = await this.objectMeta(grant.key);
    if (!meta) return text(404, "Not found");
    const headers = grant.filename
      ? {
          ...meta.headers,
          contentDisposition: contentDisposition("attachment", grant.filename),
        }
      : meta.headers;
    return this.serve(
      grant.key,
      { ...headers, cacheControl: "private, no-store" },
      request.method === "HEAD",
    );
  }

  private async serve(
    key: string,
    headers: ServeHeaders,
    headOnly: boolean,
  ): Promise<Response> {
    const bytes = await this.blobs.get(`objects/${key}`);
    if (!bytes) return text(404, "Not found");
    return new Response(headOnly ? null : new Uint8Array(bytes), {
      headers: {
        "Content-Type": headers.contentType,
        "Content-Disposition": headers.contentDisposition,
        "Content-Length": String(bytes.length),
        "Cache-Control": headers.cacheControl,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  }
}

function text(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
