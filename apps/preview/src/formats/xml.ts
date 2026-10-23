/**
 * Small helpers for the XML inside Office, OpenDocument and EPUB files. They match
 * elements by local name ("p" for both a:p and text:p), which is all these readers
 * need and spares them namespace bookkeeping.
 */

export type Files = Readonly<Record<string, Uint8Array>>;

const decoder = new TextDecoder();

export function text(files: Files, path: string): string | null {
  const bytes = files[path];
  return bytes ? decoder.decode(bytes) : null;
}

export function parseXml(source: string): Document | null {
  const doc = new DOMParser().parseFromString(source, "application/xml");
  return doc.getElementsByTagName("parsererror").length > 0 ? null : doc;
}

export function xml(files: Files, path: string): Document | null {
  const source = text(files, path);
  return source === null ? null : parseXml(source);
}

/** Element children with this local name. */
export function children(parent: Element | Document, name: string): Element[] {
  const found: Element[] = [];
  const list =
    parent instanceof Document
      ? [parent.documentElement]
      : [...parent.children];
  for (const child of list) if (child.localName === name) found.push(child);
  return found;
}

export function child(
  parent: Element | Document | null | undefined,
  name: string,
): Element | null {
  if (!parent) return null;
  return children(parent, name)[0] ?? null;
}

/** The first descendant with this local name. */
export function find(
  parent: Element | Document | null | undefined,
  name: string,
): Element | null {
  if (!parent) return null;
  return parent.getElementsByTagNameNS("*", name)[0] ?? null;
}

export function findAll(
  parent: Element | Document | null | undefined,
  name: string,
): Element[] {
  if (!parent) return [];
  return [...parent.getElementsByTagNameNS("*", name)];
}

/** An attribute by local name, whatever its prefix ("r:embed", "xlink:href"). */
export function attr(element: Element | null, name: string): string | null {
  if (!element) return null;
  for (const attribute of element.attributes)
    if (attribute.localName === name) return attribute.value;
  return null;
}

/** An OOXML relationship id (`r:id`), which shares its local name with plain `id`. */
export function relId(element: Element | null): string | null {
  if (!element) return null;
  for (const attribute of element.attributes)
    if (
      attribute.localName === "id" &&
      attribute.namespaceURI?.endsWith("/relationships")
    )
      return attribute.value;
  return null;
}

/** Resolves `target` against the folder of `from` ("ppt/slides/slide1.xml" + "../media/a.png"). */
export function resolvePath(from: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = from.split("/").slice(0, -1);
  for (const part of target.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== "." && part !== "") parts.push(part);
  }
  return parts.join("/");
}

/** A path with any `#fragment` or `?query` taken off, and %-escapes undone. */
export function cleanPath(path: string): string {
  const bare = path.split(/[#?]/)[0] ?? "";
  try {
    return decodeURIComponent(bare);
  } catch {
    return bare;
  }
}

export interface Relationship {
  id: string;
  type: string;
  /** Resolved against the part that owns the relationships. */
  target: string;
  external: boolean;
}

/** An OOXML part's relationships (its _rels/<name>.rels), by id. */
export function relationships(
  files: Files,
  part: string,
): Map<string, Relationship> {
  const slash = part.lastIndexOf("/");
  const folder = part.slice(0, slash + 1);
  const name = part.slice(slash + 1);
  const doc = xml(files, `${folder}_rels/${name}.rels`);
  const map = new Map<string, Relationship>();
  for (const rel of findAll(doc, "Relationship")) {
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (!id || !target) continue;
    const external = rel.getAttribute("TargetMode") === "External";
    map.set(id, {
      id,
      type: rel.getAttribute("Type") ?? "",
      target: external ? target : resolvePath(part, cleanPath(target)),
      external,
    });
  }
  return map;
}

/** The MIME type for a picture inside a document, by its extension. */
export function imageMime(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    avif: "image/avif",
  };
  return types[ext] ?? null;
}

/** A picture as a data: URL (works inside sandboxes, unlike blob: URLs). */
export function dataUrl(files: Files, path: string): string | null {
  const bytes = files[path];
  const mime = imageMime(path);
  if (!bytes || !mime) return null;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(binary)}`;
}
