/**
 * EPUB books: the reading order (spine) from the package file, chapter titles from
 * the table of contents (EPUB 3's nav, or EPUB 2's NCX), and each chapter's body,
 * with its pictures turned into data: URLs. The viewer sanitises what it shows.
 */
import {
  attr,
  cleanPath,
  dataUrl,
  find,
  findAll,
  parseXml,
  resolvePath,
  text,
  xml,
  type Files,
} from "./xml";

export interface Chapter {
  path: string;
  title: string;
}

export interface Book {
  title: string;
  author: string;
  chapters: Chapter[];
}

export function parseEpub(files: Files): Book {
  const container = xml(files, "META-INF/container.xml");
  const opfPath = find(container, "rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("No rootfile in META-INF/container.xml");
  const opf = xml(files, opfPath);
  if (!opf) throw new Error(`Can't read ${opfPath}`);

  const manifest = new Map<
    string,
    { path: string; type: string; properties: string }
  >();
  for (const item of findAll(opf, "item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) continue;
    manifest.set(id, {
      path: resolvePath(opfPath, cleanPath(href)),
      type: item.getAttribute("media-type") ?? "",
      properties: item.getAttribute("properties") ?? "",
    });
  }

  const titles = new Map<string, string>();
  const nav = [...manifest.values()].find((item) =>
    item.properties.split(/\s+/).includes("nav"),
  );
  if (nav) {
    const doc = xml(files, nav.path);
    for (const link of findAll(doc, "a")) {
      const href = link.getAttribute("href");
      const label = link.textContent.trim();
      if (!href || !label) continue;
      const path = resolvePath(nav.path, cleanPath(href));
      if (!titles.has(path)) titles.set(path, label);
    }
  }
  const ncxId = find(opf, "spine")?.getAttribute("toc");
  const ncx = ncxId ? manifest.get(ncxId) : undefined;
  if (ncx && titles.size === 0) {
    const doc = xml(files, ncx.path);
    for (const point of findAll(doc, "navPoint")) {
      const label = find(find(point, "navLabel"), "text")?.textContent.trim();
      const src = attr(find(point, "content"), "src");
      if (!label || !src) continue;
      const path = resolvePath(ncx.path, cleanPath(src));
      if (!titles.has(path)) titles.set(path, label);
    }
  }

  const chapters: Chapter[] = [];
  for (const ref of findAll(opf, "itemref")) {
    const item = manifest.get(ref.getAttribute("idref") ?? "");
    if (!item || !files[item.path]) continue;
    chapters.push({
      path: item.path,
      title: titles.get(item.path) ?? `Part ${String(chapters.length + 1)}`,
    });
  }

  return {
    title: find(opf, "title")?.textContent.trim() ?? "",
    author: find(opf, "creator")?.textContent.trim() ?? "",
    chapters,
  };
}

/**
 * A chapter's body as HTML (not yet sanitised), pictures inlined as data: URLs, and
 * links to other chapters as `#chapter:<path>`.
 */
export function chapterHtml(files: Files, path: string): string {
  const source = text(files, path) ?? "";
  const doc =
    parseXml(source) ?? new DOMParser().parseFromString(source, "text/html");
  const body = find(doc, "body");
  if (!body) return "";
  for (const image of [...findAll(body, "img"), ...findAll(body, "image")]) {
    const attribute = image.localName === "img" ? "src" : "href";
    const value = attr(image, attribute);
    if (!value || /^[a-z]+:/i.test(value)) continue;
    const url = dataUrl(files, resolvePath(path, cleanPath(value)));
    if (url) {
      image.removeAttribute(attribute);
      for (const old of [...image.attributes])
        if (old.localName === "href") image.removeAttributeNode(old);
      image.setAttribute(attribute, url);
    }
  }
  for (const link of findAll(body, "a")) {
    const href = link.getAttribute("href");
    if (!href || /^[a-z]+:/i.test(href) || href.startsWith("#")) continue;
    link.setAttribute("href", `#chapter:${resolvePath(path, cleanPath(href))}`);
  }
  const serializer = new XMLSerializer();
  return [...body.childNodes]
    .map((node) => serializer.serializeToString(node))
    .join("");
}
