/**
 * Huawei Cloud OBS through its S3-compatible API, signed with AWS Signature V4
 * (aws4fetch: small, fetch-based, bundles cleanly into the server).
 *
 * The bucket stays private. Uploads go from the browser straight to OBS through
 * presigned part URLs; published objects get a public-read ACL and are served from
 * the bucket's custom domain (FILES_URL). From a server in the same region, the
 * bucket's hostname resolves to Huawei's internal network, so the server's own
 * reads (hashing, checks) cost no traffic.
 */
import { AwsClient } from "aws4fetch";
import {
  contentDisposition,
  trimTrailingSlashes,
  type ServeHeaders,
} from "./files";
import {
  StorageError,
  type ObjectInfo,
  type StorageDriver,
  type UploadedPart,
} from "./driver";

export interface ObsConfig {
  bucket: string;
  /** e.g. "cn-southwest-2". */
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** The custom domain public objects are served from, e.g. https://files.trilleo.net. */
  publicUrl: string;
  /** Defaults to the bucket's own virtual-hosted endpoint. */
  endpoint?: string;
  /** For tests. */
  fetch?: typeof fetch;
}

/** The bucket's virtual-hosted endpoint, which the browser uploads to (needs CORS). */
export function obsEndpoint(bucket: string, region: string): string {
  return `https://${bucket}.obs.${region}.myhuaweicloud.com`;
}

const TIMEOUT_MS = 30_000;

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X"))
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith("#"))
      return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return ENTITIES[entity] ?? match;
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The text of the first <tag> (S3's answers are flat enough for this). */
export function xmlValue(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match?.[1] === undefined ? null : decodeXml(match[1]);
}

/** Every <tag>…</tag> block's inside. */
export function xmlBlocks(xml: string, tag: string): string[] {
  return [
    ...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g")),
  ].map((match) => match[1] ?? "");
}

export class ObsDriver implements StorageDriver {
  readonly kind = "obs";
  private readonly client: AwsClient;
  private readonly base: string;
  private readonly filesUrl: string;
  private readonly send: typeof fetch;

  constructor(config: ObsConfig) {
    this.send = config.fetch ?? fetch;
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: "s3",
      region: config.region,
    });
    this.base = trimTrailingSlashes(
      config.endpoint ?? obsEndpoint(config.bucket, config.region),
    );
    this.filesUrl = trimTrailingSlashes(config.publicUrl);
  }

  private url(key: string, query = ""): string {
    return `${this.base}/${key}${query}`;
  }

  /** Signs and sends a request; non-2xx answers (and S3's 200-with-<Error>) throw. */
  private async request(
    url: string,
    init: RequestInit & { allow404?: boolean; timeout?: boolean } = {},
  ): Promise<Response> {
    const { allow404, timeout = true, ...rest } = init;
    const signed = await this.client.sign(url, rest);
    let response: Response;
    try {
      response = await this.send(signed, {
        signal: timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
      });
    } catch (error) {
      throw new StorageError(
        `OBS didn't answer: ${error instanceof Error ? error.message : String(error)}`,
        0,
      );
    }
    if (response.ok || (allow404 && response.status === 404)) return response;
    const body = await response.text().catch(() => "");
    throw new StorageError(
      xmlValue(body, "Message") ??
        `OBS answered ${String(response.status)} for ${rest.method ?? "GET"}`,
      response.status,
      xmlValue(body, "Code") ?? undefined,
    );
  }

  async startUpload(key: string, headers: ServeHeaders): Promise<string> {
    const response = await this.request(this.url(key, "?uploads"), {
      method: "POST",
      headers: {
        "Content-Type": headers.contentType,
        "Content-Disposition": headers.contentDisposition,
        "Cache-Control": headers.cacheControl,
        "x-amz-acl": "private",
      },
    });
    const uploadId = xmlValue(await response.text(), "UploadId");
    if (!uploadId) throw new StorageError("OBS gave no upload id", 502);
    return uploadId;
  }

  async partUrl(
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn: number,
  ): Promise<string> {
    const query = new URLSearchParams({
      partNumber: String(partNumber),
      uploadId,
      "X-Amz-Expires": String(expiresIn),
    });
    const signed = await this.client.sign(this.url(key, `?${query}`), {
      method: "PUT",
      aws: { signQuery: true },
    });
    return signed.url;
  }

  async listParts(key: string, uploadId: string): Promise<UploadedPart[]> {
    const parts: UploadedPart[] = [];
    let marker = "0";
    for (;;) {
      const query = new URLSearchParams({
        uploadId,
        "max-parts": "1000",
        "part-number-marker": marker,
      });
      const xml = await (await this.request(this.url(key, `?${query}`))).text();
      for (const block of xmlBlocks(xml, "Part")) {
        parts.push({
          partNumber: Number(xmlValue(block, "PartNumber")),
          etag: xmlValue(block, "ETag") ?? "",
          size: Number(xmlValue(block, "Size")),
        });
      }
      const next = xmlValue(xml, "NextPartNumberMarker");
      if (xmlValue(xml, "IsTruncated") !== "true" || !next || next === marker)
        break;
      marker = next;
    }
    return parts.sort((a, b) => a.partNumber - b.partNumber);
  }

  async finishUpload(
    key: string,
    uploadId: string,
    parts: readonly UploadedPart[],
  ): Promise<void> {
    const body = `<CompleteMultipartUpload>${parts
      .map(
        (part) =>
          `<Part><PartNumber>${String(part.partNumber)}</PartNumber><ETag>${escapeXml(part.etag)}</ETag></Part>`,
      )
      .join("")}</CompleteMultipartUpload>`;
    const response = await this.request(
      this.url(key, `?${new URLSearchParams({ uploadId })}`),
      {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body,
        // Joining many parts can take a while.
        timeout: false,
      },
    );
    // S3 may answer 200 and still fail, with the error in the body.
    const text = await response.text();
    if (text.includes("<Error>")) {
      throw new StorageError(
        xmlValue(text, "Message") ?? "OBS couldn't finish the upload",
        500,
        xmlValue(text, "Code") ?? undefined,
      );
    }
  }

  async abortUpload(key: string, uploadId: string): Promise<void> {
    await this.request(this.url(key, `?${new URLSearchParams({ uploadId })}`), {
      method: "DELETE",
      allow404: true,
    });
  }

  async put(
    key: string,
    bytes: Uint8Array,
    headers: ServeHeaders,
  ): Promise<void> {
    await this.request(this.url(key), {
      method: "PUT",
      headers: {
        "Content-Type": headers.contentType,
        "Content-Disposition": headers.contentDisposition,
        "Cache-Control": headers.cacheControl,
        "x-amz-acl": "private",
      },
      body: new Uint8Array(bytes),
    });
  }

  async head(key: string): Promise<ObjectInfo | null> {
    const response = await this.request(this.url(key), {
      method: "HEAD",
      allow404: true,
    });
    if (response.status === 404) return null;
    return {
      size: Number(response.headers.get("content-length") ?? "0"),
      contentType: response.headers.get("content-type"),
    };
  }

  async read(
    key: string,
    range?: { start: number; end: number },
  ): Promise<ReadableStream<Uint8Array>> {
    const headers: Record<string, string> = {};
    if (range) {
      if (range.end <= range.start) return new Blob([]).stream();
      headers.Range = `bytes=${String(range.start)}-${String(range.end - 1)}`;
    }
    const response = await this.request(this.url(key), {
      headers,
      // Whole objects can be big; the caller decides how long to wait.
      timeout: range !== undefined,
    });
    if (!response.body) return new Blob([]).stream();
    return response.body;
  }

  async setPublic(key: string, isPublic: boolean): Promise<void> {
    await this.request(this.url(key, "?acl"), {
      method: "PUT",
      headers: { "x-amz-acl": isPublic ? "public-read" : "private" },
    });
  }

  async remove(key: string): Promise<void> {
    await this.request(this.url(key), { method: "DELETE", allow404: true });
  }

  publicUrl(key: string): string {
    return `${this.filesUrl}/${key}`;
  }

  async signedUrl(
    key: string,
    expiresIn: number,
    options: { filename?: string } = {},
  ): Promise<string> {
    const query = new URLSearchParams({ "X-Amz-Expires": String(expiresIn) });
    if (options.filename) {
      query.set(
        "response-content-disposition",
        contentDisposition("attachment", options.filename),
      );
    }
    const signed = await this.client.sign(this.url(key, `?${query}`), {
      method: "GET",
      aws: { signQuery: true },
    });
    return signed.url;
  }
}
