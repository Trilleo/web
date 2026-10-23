import { strToU8, zipSync } from "fflate";
import { gzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { detectViewer, extensionOf } from "./detect";
import { docx, epub, odt, pptx, xlsx } from "./fixtures";
import {
  ArchiveError,
  extractEntry,
  gunzip,
  listZip,
  unzipDocument,
} from "./formats/archive";
import { chapterHtml, parseEpub } from "./formats/epub";
import { parseOdp, parseOdt } from "./formats/odf";
import { parsePptx } from "./formats/pptx";
import { rtfToParagraphs } from "./formats/rtf";
import { resolvePath } from "./formats/xml";

const text = (value: string) => strToU8(value);

describe("detectViewer", () => {
  it("tells the ZIP-based documents apart by what's inside", () => {
    expect(detectViewer(docx(), "x.bin").kind).toBe("docx");
    expect(detectViewer(xlsx(), "x").kind).toBe("sheet");
    expect(detectViewer(pptx(), "x").kind).toBe("pptx");
    expect(detectViewer(odt(), "x").kind).toBe("odt");
    expect(detectViewer(epub(), "x").kind).toBe("epub");
    expect(
      detectViewer(zipSync({ "a.txt": text("a") }), "bundle.zip").kind,
    ).toBe("zip");
  });

  it("goes by the bytes, not the name", () => {
    expect(detectViewer(text("%PDF-1.7\n"), "report.docx").kind).toBe("pdf");
    expect(
      detectViewer(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "photo.txt",
      ).kind,
    ).toBe("image");
  });

  it("uses the name for text that could be several things", () => {
    expect(detectViewer(text("# Title"), "README.md").kind).toBe("markdown");
    expect(detectViewer(text("a,b\n1,2"), "data.csv").kind).toBe("sheet");
    expect(detectViewer(text("a: 1"), "config.yml")).toMatchObject({
      kind: "code",
      language: "yaml",
    });
    expect(detectViewer(text("FROM node"), "Dockerfile").language).toBe(
      "docker",
    );
    expect(detectViewer(text("just words"), "notes").language).toBe("text");
    expect(detectViewer(text('{"a":1}'), "data").kind).toBe("json");
    expect(detectViewer(text("<!doctype html><p>hi"), "page").kind).toBe(
      "html",
    );
    expect(detectViewer(text("a,b"), "x", "text/csv").kind).toBe("sheet");
    expect(detectViewer(text("{\\rtf1 hi}"), "letter").kind).toBe("rtf");
  });

  it("sends gzip, unknown binary and empty files to the right place", () => {
    expect(detectViewer(gzipSync(text("hello")), "a.txt.gz").kind).toBe("gzip");
    expect(detectViewer(Uint8Array.from([1, 2, 3, 0, 255]), "blob").kind).toBe(
      "binary",
    );
    expect(detectViewer(new Uint8Array(), "empty.txt").label).toBe(
      "Empty file",
    );
  });

  it("reads extensions without being fooled by folders or dotfiles", () => {
    expect(extensionOf("Report.Final.PDF")).toBe("pdf");
    expect(extensionOf("folder.v2/Makefile")).toBe("");
    expect(extensionOf(".gitignore")).toBe("");
  });
});

describe("parsePptx", () => {
  const deck = parsePptx(unzipDocument(pptx()));

  it("reads the slide size and order", () => {
    expect(deck.width).toBe(960);
    expect(deck.height).toBe(540);
    expect(deck.slides.map((slide) => slide.number)).toEqual([1, 2]);
  });

  it("places a placeholder where its layout puts it", () => {
    const [title, body] = deck.slides[0]?.items ?? [];
    expect(title).toMatchObject({ kind: "text", x: 0.1, defaultSize: 40 });
    if (title?.kind !== "text") throw new Error("expected text");
    expect(title.paragraphs[0]).toMatchObject({ align: "center" });
    expect(title.paragraphs[0]?.runs[0]).toMatchObject({
      text: "Quarterly plan",
      bold: true,
      size: 44,
    });
    expect(body).toMatchObject({ kind: "text", x: 0.05, y: 0.5 });
    if (body?.kind !== "text") throw new Error("expected text");
    expect(body.paragraphs[0]?.bullet).toBe(true);
  });

  it("reads pictures, backgrounds and speaker notes", () => {
    expect(deck.slides[0]?.notes).toBe("Mention the deadline.");
    expect(deck.slides[1]?.background).toBe("#0E0E0E");
    expect(deck.slides[1]?.items[0]).toMatchObject({
      kind: "image",
      path: "ppt/media/image1.png",
      alt: "A chart",
      w: 0.5,
    });
  });
});

describe("parseOdt", () => {
  it("keeps headings, spacing, lists, tables and pictures", () => {
    const blocks = parseOdt(unzipDocument(odt()));
    expect(blocks).toEqual([
      { kind: "heading", level: 1, text: "Minutes" },
      { kind: "paragraph", text: "Present:  everyone\t(late: none)" },
      { kind: "list", items: ["Budget", "Hiring"], ordered: false },
      { kind: "table", rows: [["A1", "B1"]] },
      { kind: "image", path: "Pictures/a.png", alt: "" },
    ]);
  });

  it("reads presentations' slides", () => {
    const files = {
      "content.xml": strToU8(
        `<office:document-content xmlns:office="o" xmlns:draw="d" xmlns:text="t" xmlns:presentation="p"><office:body><office:presentation>
          <draw:page draw:name="page1"><draw:frame><draw:text-box><text:p>Hello</text:p><text:p>World</text:p></draw:text-box></draw:frame>
          <presentation:notes><draw:frame><draw:text-box><text:p>Say hi</text:p></draw:text-box></draw:frame></presentation:notes></draw:page>
        </office:presentation></office:body></office:document-content>`,
      ),
    };
    const [slide] = parseOdp(files);
    expect(slide).toMatchObject({ number: 1, notes: "Say hi" });
    // The notes' frame isn't a direct child of the page, so it isn't slide text.
    expect(slide?.paragraphs).toEqual(["Hello", "World"]);
  });
});

describe("EPUB", () => {
  const files = unzipDocument(epub());
  const book = parseEpub(files);

  it("reads the title, author and chapters in reading order", () => {
    expect(book).toEqual({
      title: "A Short Book",
      author: "Ann Author",
      chapters: [
        { path: "OEBPS/text/one.xhtml", title: "Beginnings" },
        { path: "OEBPS/text/two.xhtml", title: "Endings" },
      ],
    });
  });

  it("inlines pictures and points links at chapters", () => {
    const html = chapterHtml(files, "OEBPS/text/one.xhtml");
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).toContain('href="#chapter:OEBPS/text/two.xhtml"');
  });
});

describe("rtfToParagraphs", () => {
  it("reads paragraphs, escapes and Unicode, and skips tables of fonts", () => {
    const source =
      "{\\rtf1\\ansi{\\fonttbl{\\f0 Times;}}{\\*\\generator Word;}\\f0 Caf\\'e9 \\b bold\\b0\\par Second\\tab line\\line next\\par \\u8364? euro\\par}";
    expect(rtfToParagraphs(source)).toEqual([
      "Café bold",
      "Second\tline\nnext",
      "€ euro",
    ]);
  });
});

describe("archives", () => {
  const bytes = zipSync({
    "docs/a.txt": text("alpha"),
    "docs/": new Uint8Array(),
  });

  it("lists entries without unpacking, and unpacks one", () => {
    expect(
      listZip(bytes).map((entry) => [entry.name, entry.directory]),
    ).toEqual([
      ["docs/a.txt", false],
      ["docs/", true],
    ]);
    expect(new TextDecoder().decode(extractEntry(bytes, "docs/a.txt"))).toBe(
      "alpha",
    );
    expect(() => extractEntry(bytes, "missing")).toThrow(ArchiveError);
  });

  it("unpacks gzip, refusing files that claim to be huge", () => {
    expect(new TextDecoder().decode(gunzip(gzipSync(text("hi"))))).toBe("hi");
    const lying = gzipSync(text("hi"));
    lying.set([0xff, 0xff, 0xff, 0x7f], lying.length - 4);
    expect(() => gunzip(lying)).toThrow(ArchiveError);
  });
});

it("resolves paths inside packages", () => {
  expect(resolvePath("ppt/slides/slide1.xml", "../media/a.png")).toBe(
    "ppt/media/a.png",
  );
  expect(resolvePath("OEBPS/content.opf", "text/one.xhtml")).toBe(
    "OEBPS/text/one.xhtml",
  );
  expect(resolvePath("a/b.xml", "/root.xml")).toBe("root.xml");
});

it("has a grammar for every language detect.ts names", async () => {
  const { CODE_LANGUAGES } = await import("./detect");
  const { LANGUAGES } = await import("./viewers/languages");
  for (const language of new Set(Object.values(CODE_LANGUAGES)))
    if (language !== "text")
      expect(LANGUAGES[language], language).toBeTypeOf("function");
  for (const language of ["json", "xml", "html", "markdown"])
    expect(LANGUAGES[language], language).toBeTypeOf("function");
});
