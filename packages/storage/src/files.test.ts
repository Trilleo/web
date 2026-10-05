import { describe, expect, it } from "vitest";
import {
  FILE_ID_PATTERN,
  cleanName,
  contentDisposition,
  describeName,
  extensionOf,
  newFileId,
  objectKey,
  serveHeaders,
  trimTrailingSlashes,
  urlName,
  verifyContent,
} from "./files";

const bytes = (text: string) => new TextEncoder().encode(text);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
const EXE = bytes("MZ\x90\0\x03\0\0\0");

describe("names", () => {
  it("finds the extension", () => {
    expect(extensionOf("World.MCWORLD")).toBe("mcworld");
    expect(extensionOf("archive.tar.gz")).toBe("gz");
    expect(extensionOf(".bashrc")).toBe("");
    expect(extensionOf("README")).toBe("");
    expect(extensionOf("trailing.")).toBe("");
  });

  it("cleans names to show and download as", () => {
    expect(cleanName("C:\\Users\\me\\My  World.mcworld")).toBe(
      "My World.mcworld",
    );
    expect(cleanName("../../etc/passwd")).toBe("passwd");
    expect(cleanName("...hidden")).toBe("hidden");
    expect(cleanName("evil\u202Egnp.exe")).toBe("evilgnp.exe");
    expect(cleanName("tab\there\n")).toBe("tabhere");
    expect(cleanName("")).toBe("file");
    const long = `${"a".repeat(300)}.png`;
    expect(cleanName(long)).toHaveLength(200);
    expect(cleanName(long).endsWith(".png")).toBe(true);
  });

  it("makes URL-safe names", () => {
    expect(urlName("Mój świat.mcworld")).toBe("Moj-swiat.mcworld");
    expect(urlName("my file (1).zip")).toBe("my-file-1-.zip");
    expect(urlName("我的世界.zip")).toBe("file.zip");
    expect(urlName("我的世界")).toBe("file");
    expect(urlName("--.png")).toBe("file.png");
  });

  it("builds keys from the id and the URL name", () => {
    expect(objectKey("abc123def456", "Big Castle.schem")).toBe(
      "f/abc123def456/Big-Castle.schem",
    );
  });

  it("makes random ids", () => {
    const ids = new Set(Array.from({ length: 100 }, newFileId));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(id).toMatch(FILE_ID_PATTERN);
  });
});

describe("types", () => {
  it("describes known and unknown names", () => {
    expect(describeName("a.png")).toMatchObject({
      mime: "image/png",
      kind: "image",
    });
    expect(describeName("pack.mcpack").label).toBe("Minecraft pack");
    expect(describeName("thing.weird")).toEqual({
      mime: "application/octet-stream",
      kind: "data",
      label: "WEIRD file",
    });
    // Not fooled by names that are Object properties.
    expect(describeName("x.constructor").label).toBe("CONSTRUCTOR file");
  });

  it("shows safe media inline and downloads everything else", () => {
    expect(serveHeaders("a.png").contentDisposition).toMatch(/^inline;/);
    expect(serveHeaders("a.mp4").contentDisposition).toMatch(/^inline;/);
    expect(serveHeaders("a.zip").contentDisposition).toMatch(/^attachment;/);
    expect(serveHeaders("a.txt").contentDisposition).toMatch(/^attachment;/);
    expect(serveHeaders("a.png").cacheControl).toBe("public, max-age=86400");
  });

  it("never serves anything a browser would run as a page", () => {
    for (const name of ["a.html", "a.svg", "a.xml", "a.js"]) {
      const headers = serveHeaders(name);
      expect(headers.contentType).toBe("application/octet-stream");
      expect(headers.contentDisposition).toMatch(/^attachment;/);
    }
  });

  it("writes Content-Disposition with an ASCII fallback and the UTF-8 name", () => {
    expect(contentDisposition("attachment", "Mój świat (1).zip")).toBe(
      `attachment; filename="Moj-swiat-1-.zip"; filename*=UTF-8''M%C3%B3j%20%C5%9Bwiat%20%281%29.zip`,
    );
  });
});

describe("verifyContent", () => {
  const user = { allowPrograms: false };
  const admin = { allowPrograms: true };

  it("accepts files whose bytes match an inline type", () => {
    const verdict = verifyContent("photo.png", PNG, user);
    expect(verdict).toMatchObject({
      ok: true,
      description: { mime: "image/png", label: "PNG image" },
    });
  });

  it("refuses an inline type whose bytes are something else", () => {
    expect(verifyContent("photo.png", bytes("<html><script>"), user)).toEqual(
      expect.objectContaining({ ok: false, reason: "mismatch" }),
    );
    expect(verifyContent("doc.pdf", PNG, user)).toEqual(
      expect.objectContaining({ ok: false, reason: "mismatch" }),
    );
  });

  it("lets downloads be anything, keeping the name's label", () => {
    expect(verifyContent("world.mcworld", ZIP, user)).toMatchObject({
      ok: true,
      description: { label: "Minecraft world", kind: "archive" },
    });
    expect(verifyContent("notes.weird", bytes("hello"), user)).toMatchObject({
      ok: true,
      description: {
        label: "Plain text",
        kind: "text",
        mime: "application/octet-stream",
      },
    });
  });

  it("keeps native programs to admins, whatever their name", () => {
    expect(verifyContent("setup.exe", EXE, user)).toMatchObject({
      ok: false,
      reason: "program",
    });
    expect(verifyContent("innocent.zip", EXE, user)).toMatchObject({
      ok: false,
      reason: "program",
    });
    expect(verifyContent("run.bat", bytes("echo hi"), user)).toMatchObject({
      ok: false,
      reason: "program",
    });
    expect(verifyContent("setup.exe", EXE, admin)).toMatchObject({ ok: true });
  });

  it("allows Java archives (mods are .jar files)", () => {
    const jar = new Uint8Array([
      ...ZIP.subarray(0, 4),
      ...new Uint8Array(22),
      9,
      0,
      0,
      0,
      ...bytes("META-INF/"),
    ]);
    expect(verifyContent("mod.jar", jar, user)).toMatchObject({ ok: true });
  });
});

describe("trimTrailingSlashes", () => {
  it("drops every trailing slash and nothing else", () => {
    expect(trimTrailingSlashes("https://files.trilleo.net///")).toBe(
      "https://files.trilleo.net",
    );
    expect(trimTrailingSlashes("/api/storage")).toBe("/api/storage");
    expect(trimTrailingSlashes("///")).toBe("");
    expect(trimTrailingSlashes("")).toBe("");
  });

  it("stays fast on long runs of slashes", () => {
    const input = "a" + "/".repeat(100_000) + "b";
    const started = performance.now();
    expect(trimTrailingSlashes(input)).toBe(input);
    expect(performance.now() - started).toBeLessThan(100);
  });
});
