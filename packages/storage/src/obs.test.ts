import { describe, expect, it } from "vitest";
import { StorageError } from "./driver";
import { serveHeaders } from "./files";
import { ObsDriver, obsEndpoint, xmlBlocks, xmlValue } from "./obs";

interface Sent {
  method: string;
  url: URL;
  headers: Headers;
  body: string;
}

/** An ObsDriver whose requests go to `answer` instead of OBS. */
function fake(answer: (sent: Sent) => Response | Promise<Response>) {
  const sent: Sent[] = [];
  const driver = new ObsDriver({
    bucket: "bucket",
    region: "cn-southwest-2",
    accessKeyId: "AK",
    secretAccessKey: "SK",
    publicUrl: "https://files.example.net/",
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const entry = {
        method: request.method,
        url: new URL(request.url),
        headers: request.headers,
        body: await request.text(),
      };
      sent.push(entry);
      return answer(entry);
    },
  });
  return { driver, sent };
}

const xml = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "application/xml" },
  });

describe("xml helpers", () => {
  it("reads values and blocks, decoding entities", () => {
    const body =
      "<R><Part><ETag>&quot;a&quot;</ETag></Part><Part><ETag>&#34;b&#x22;</ETag></Part></R>";
    expect(
      xmlBlocks(body, "Part").map((part) => xmlValue(part, "ETag")),
    ).toEqual(['"a"', '"b"']);
    expect(xmlValue(body, "Missing")).toBeNull();
  });
});

describe("ObsDriver", () => {
  it("uses the bucket's virtual-hosted endpoint", () => {
    expect(obsEndpoint("trilleo-web-storage", "cn-southwest-2")).toBe(
      "https://trilleo-web-storage.obs.cn-southwest-2.myhuaweicloud.com",
    );
  });

  it("starts a private multipart upload with the serving headers", async () => {
    const { driver, sent } = fake(() =>
      xml(
        "<InitiateMultipartUploadResult><UploadId>up-1</UploadId></InitiateMultipartUploadResult>",
      ),
    );
    const id = await driver.startUpload("f/x/a.png", serveHeaders("a.png"));
    expect(id).toBe("up-1");
    const [request] = sent;
    expect(request?.method).toBe("POST");
    expect(request?.url.href).toBe(
      "https://bucket.obs.cn-southwest-2.myhuaweicloud.com/f/x/a.png?uploads",
    );
    expect(request?.headers.get("x-amz-acl")).toBe("private");
    expect(request?.headers.get("content-type")).toBe("image/png");
    expect(request?.headers.get("content-disposition")).toMatch(/^inline/);
    expect(request?.headers.get("cache-control")).toBe("public, max-age=86400");
    expect(request?.headers.get("authorization")).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AK\/\d{8}\/cn-southwest-2\/s3\/aws4_request/,
    );
  });

  it("presigns part URLs the browser can PUT to", async () => {
    const { driver, sent } = fake(() => xml(""));
    const url = new URL(await driver.partUrl("f/x/a.png", "up 1", 3, 900));
    expect(sent).toHaveLength(0);
    expect(url.origin).toBe(
      "https://bucket.obs.cn-southwest-2.myhuaweicloud.com",
    );
    expect(url.searchParams.get("partNumber")).toBe("3");
    expect(url.searchParams.get("uploadId")).toBe("up 1");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("lists parts across pages", async () => {
    const { driver, sent } = fake(({ url }) =>
      url.searchParams.get("part-number-marker") === "0"
        ? xml(
            "<ListPartsResult><IsTruncated>true</IsTruncated><NextPartNumberMarker>1</NextPartNumberMarker><Part><PartNumber>1</PartNumber><ETag>&quot;e1&quot;</ETag><Size>5</Size></Part></ListPartsResult>",
          )
        : xml(
            "<ListPartsResult><IsTruncated>false</IsTruncated><Part><PartNumber>2</PartNumber><ETag>&quot;e2&quot;</ETag><Size>3</Size></Part></ListPartsResult>",
          ),
    );
    expect(await driver.listParts("f/x/a.png", "up-1")).toEqual([
      { partNumber: 1, etag: '"e1"', size: 5 },
      { partNumber: 2, etag: '"e2"', size: 3 },
    ]);
    expect(sent).toHaveLength(2);
  });

  it("finishes uploads, and notices errors hidden in a 200", async () => {
    const { driver, sent } = fake(() =>
      xml("<CompleteMultipartUploadResult/>"),
    );
    await driver.finishUpload("f/x/a.png", "up-1", [
      { partNumber: 1, etag: '"e1"', size: 5 },
    ]);
    expect(sent[0]?.body).toBe(
      "<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>&quot;e1&quot;</ETag></Part></CompleteMultipartUpload>",
    );

    const failing = fake(() =>
      xml(
        "<Error><Code>InternalError</Code><Message>Try again</Message></Error>",
      ),
    );
    await expect(
      failing.driver.finishUpload("f/x/a.png", "up-1", []),
    ).rejects.toThrow("Try again");
  });

  it("turns error answers into StorageErrors", async () => {
    const { driver } = fake(() =>
      xml(
        "<Error><Code>AccessDenied</Code><Message>Denied</Message></Error>",
        403,
      ),
    );
    const error = await driver
      .setPublic("f/x/a.png", true)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StorageError);
    expect(error).toMatchObject({ status: 403, code: "AccessDenied" });
  });

  it("switches the ACL to publish and unpublish", async () => {
    const { driver, sent } = fake(() => new Response(null));
    await driver.setPublic("f/x/a.png", true);
    await driver.setPublic("f/x/a.png", false);
    expect(
      sent.map((s) => [s.method, s.url.search, s.headers.get("x-amz-acl")]),
    ).toEqual([
      ["PUT", "?acl", "public-read"],
      ["PUT", "?acl", "private"],
    ]);
  });

  it("heads, reads ranges and deletes", async () => {
    const { driver, sent } = fake(({ method }) => {
      if (method === "HEAD")
        return new Response(null, {
          headers: { "Content-Length": "42", "Content-Type": "image/png" },
        });
      if (method === "DELETE") return new Response(null, { status: 404 });
      return new Response("abc");
    });
    expect(await driver.head("f/x/a.png")).toEqual({
      size: 42,
      contentType: "image/png",
    });
    const stream = await driver.read("f/x/a.png", { start: 0, end: 3 });
    expect(await new Response(stream).text()).toBe("abc");
    expect(sent[1]?.headers.get("range")).toBe("bytes=0-2");
    // Deleting what's already gone is fine.
    await driver.remove("f/x/a.png");
  });

  it("answers null for a missing object", async () => {
    const { driver } = fake(() => new Response(null, { status: 404 }));
    expect(await driver.head("f/x/nope")).toBeNull();
  });

  it("builds public URLs on the files domain and signed private links", async () => {
    const { driver } = fake(() => xml(""));
    expect(driver.publicUrl("f/x/a.png")).toBe(
      "https://files.example.net/f/x/a.png",
    );
    const url = new URL(
      await driver.signedUrl("f/x/a.png", 300, { filename: "A.png" }),
    );
    expect(url.searchParams.get("response-content-disposition")).toMatch(
      /^attachment; filename="A.png"/,
    );
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
  });
});
