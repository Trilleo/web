/**
 * OpenDocument text (.odt) and presentations (.odp), read from content.xml: headings,
 * paragraphs, lists, tables and pictures for text; each slide's text and pictures for
 * presentations. Styling is left out; the viewer sets them in the site's own type.
 */
import { attr, child, children, find, findAll, xml, type Files } from "./xml";

export type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[]; ordered: boolean }
  | { kind: "table"; rows: string[][] }
  | { kind: "image"; path: string; alt: string };

/** An element's text with ODF's spacing elements (text:s, text:tab, text:line-break). */
export function odfText(element: Element): string {
  let out = "";
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? "";
      continue;
    }
    if (!(node instanceof Element)) continue;
    switch (node.localName) {
      case "s":
        out += " ".repeat(Math.max(1, Number(attr(node, "c") ?? "1") || 1));
        break;
      case "tab":
        out += "\t";
        break;
      case "line-break":
        out += "\n";
        break;
      case "note":
      case "annotation":
        // Footnote bodies and comments would interrupt the sentence.
        break;
      default:
        out += odfText(node);
    }
  }
  return out;
}

function images(element: Element): Block[] {
  return findAll(element, "image")
    .map((image) => attr(image, "href"))
    .filter((href): href is string => Boolean(href && !/^[a-z]+:/i.test(href)))
    .map((path) => ({
      kind: "image",
      path: path.replace(/^\.\//, ""),
      alt: "",
    }));
}

function listItems(list: Element): string[] {
  const items: string[] = [];
  for (const item of children(list, "list-item")) {
    for (const part of item.children) {
      if (part.localName === "list") items.push(...listItems(part));
      else items.push(odfText(part));
    }
  }
  return items.filter((item) => item.trim());
}

function blocksOf(parent: Element, out: Block[]): void {
  for (const node of parent.children) {
    switch (node.localName) {
      case "h":
        out.push({
          kind: "heading",
          level: Math.min(
            6,
            Math.max(1, Number(attr(node, "outline-level") ?? "1") || 1),
          ),
          text: odfText(node),
        });
        break;
      case "p": {
        const text = odfText(node);
        if (text.trim()) out.push({ kind: "paragraph", text });
        out.push(...images(node));
        break;
      }
      case "list":
        out.push({
          kind: "list",
          items: listItems(node),
          ordered: false,
        });
        break;
      case "table":
        out.push({
          kind: "table",
          rows: findAll(node, "table-row").map((row) =>
            children(row, "table-cell").map((cell) =>
              children(cell, "p").map(odfText).join("\n"),
            ),
          ),
        });
        break;
      case "section":
      case "index-body":
      case "table-of-content":
        blocksOf(node, out);
        break;
      default:
        break;
    }
  }
}

export function parseOdt(files: Files): Block[] {
  const doc = xml(files, "content.xml");
  const body = find(find(doc, "body"), "text");
  if (!body) throw new Error("No office:text in content.xml");
  const blocks: Block[] = [];
  blocksOf(body, blocks);
  return blocks;
}

export interface OdpSlide {
  number: number;
  name: string;
  paragraphs: string[];
  images: string[];
  notes: string;
}

export function parseOdp(files: Files): OdpSlide[] {
  const doc = xml(files, "content.xml");
  return findAll(doc, "page").map((page, index) => {
    const paragraphs: string[] = [];
    const pictures: string[] = [];
    for (const frame of children(page, "frame")) {
      const box = child(frame, "text-box");
      if (box)
        for (const p of findAll(box, "p")) {
          const text = odfText(p);
          if (text.trim()) paragraphs.push(text);
        }
      for (const image of images(frame))
        if (image.kind === "image") pictures.push(image.path);
    }
    const notes = find(page, "notes");
    return {
      number: index + 1,
      name: attr(page, "name") ?? "",
      paragraphs,
      images: pictures,
      notes: notes ? findAll(notes, "p").map(odfText).join("\n").trim() : "",
    };
  });
}
