/**
 * PowerPoint (.pptx) slides, read by hand: each slide's text boxes, pictures and
 * tables with their positions, so the viewer can lay them out roughly where they
 * are. Not a renderer: no theme fonts, shapes, charts or animations. Positions a
 * slide leaves to its layout (placeholders) are looked up there, then in the master.
 */
import {
  attr,
  child,
  children,
  find,
  findAll,
  relId,
  relationships,
  xml,
  type Files,
  type Relationship,
} from "./xml";

export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** Points, if set. */
  size: number | null;
  /** "#RRGGBB", if set as a plain colour. */
  color: string | null;
}

export interface Paragraph {
  runs: Run[];
  align: "left" | "center" | "right" | "justify";
  level: number;
  bullet: boolean;
}

interface Box {
  /** Fractions of the slide (0–1). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SlideItem =
  | (Box & {
      kind: "text";
      paragraphs: Paragraph[];
      /** Points, for runs that don't say. */
      defaultSize: number;
      fill: string | null;
      anchor: "top" | "middle" | "bottom";
    })
  | (Box & { kind: "image"; path: string; alt: string })
  | (Box & { kind: "table"; rows: string[][] });

export interface Slide {
  number: number;
  items: SlideItem[];
  notes: string;
  background: string | null;
  hidden: boolean;
}

export interface Presentation {
  /** Slide size in points. */
  width: number;
  height: number;
  slides: Slide[];
}

const EMU_PER_POINT = 12_700;
const REL_SLIDE = "/slide";
const REL_LAYOUT = "/slideLayout";
const REL_MASTER = "/slideMaster";
const REL_NOTES = "/notesSlide";

type Transform = (x: number, y: number, w: number, h: number) => Box;

function num(value: string | null, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== null ? parsed : fallback;
}

function xfrmOf(element: Element): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  const props = child(element, "spPr") ?? child(element, "grpSpPr");
  const xfrm = child(props, "xfrm") ?? child(element, "xfrm");
  const off = child(xfrm, "off");
  const ext = child(xfrm, "ext");
  if (!off || !ext) return null;
  return {
    x: num(off.getAttribute("x")),
    y: num(off.getAttribute("y")),
    w: num(ext.getAttribute("cx")),
    h: num(ext.getAttribute("cy")),
  };
}

function solidColor(parent: Element | null): string | null {
  const rgb = find(child(parent, "solidFill"), "srgbClr")?.getAttribute("val");
  return rgb && /^[0-9a-f]{6}$/i.test(rgb) ? `#${rgb.toUpperCase()}` : null;
}

function placeholderOf(shape: Element): { type: string; idx: string } | null {
  const nv =
    child(shape, "nvSpPr") ??
    child(shape, "nvPicPr") ??
    child(shape, "nvGraphicFramePr");
  const ph = find(child(nv, "nvPr"), "ph");
  if (!ph) return null;
  return {
    type: ph.getAttribute("type") ?? "body",
    idx: ph.getAttribute("idx") ?? "",
  };
}

const sameKind = (a: string, b: string) => {
  const norm = (type: string) =>
    type === "ctrTitle" ? "title" : type === "subTitle" ? "body" : type;
  return norm(a) === norm(b);
};

/** Where a placeholder sits on a layout or master, if that part says. */
function placeholderXfrm(
  doc: Document | null,
  ph: { type: string; idx: string },
): ReturnType<typeof xfrmOf> {
  if (!doc) return null;
  const shapes = findAll(doc, "sp");
  const withPh = shapes
    .map((shape) => ({ shape, ph: placeholderOf(shape) }))
    .filter((entry) => entry.ph);
  const byIdx = ph.idx
    ? withPh.find((entry) => entry.ph?.idx === ph.idx)
    : undefined;
  const byType = withPh.find(
    (entry) => entry.ph && sameKind(entry.ph.type, ph.type),
  );
  const found = byIdx ?? byType;
  return found ? xfrmOf(found.shape) : null;
}

function readParagraphs(body: Element | null): Paragraph[] {
  if (!body) return [];
  return children(body, "p").map((p) => {
    const props = child(p, "pPr");
    const algn = props?.getAttribute("algn");
    const runs: Run[] = [];
    for (const node of p.children) {
      if (node.localName === "br") {
        runs.push({
          text: "\n",
          bold: false,
          italic: false,
          underline: false,
          size: null,
          color: null,
        });
        continue;
      }
      if (node.localName !== "r" && node.localName !== "fld") continue;
      const rPr = child(node, "rPr");
      const size = rPr?.getAttribute("sz");
      runs.push({
        text: child(node, "t")?.textContent ?? "",
        bold: rPr?.getAttribute("b") === "1",
        italic: rPr?.getAttribute("i") === "1",
        underline: (rPr?.getAttribute("u") ?? "none") !== "none",
        size: size ? num(size) / 100 : null,
        color: solidColor(rPr),
      });
    }
    return {
      runs,
      align:
        algn === "ctr"
          ? "center"
          : algn === "r"
            ? "right"
            : algn === "just"
              ? "justify"
              : "left",
      level: num(props?.getAttribute("lvl") ?? null),
      bullet: Boolean(child(props, "buChar") ?? child(props, "buAutoNum")),
    };
  });
}

interface Context {
  rels: Map<string, Relationship>;
  layout: Document | null;
  master: Document | null;
}

function walk(
  tree: Element,
  transform: Transform,
  context: Context,
  items: SlideItem[],
): void {
  for (const shape of tree.children) {
    switch (shape.localName) {
      case "sp": {
        const body = child(shape, "txBody");
        const ph = placeholderOf(shape);
        const box =
          xfrmOf(shape) ??
          (ph
            ? (placeholderXfrm(context.layout, ph) ??
              placeholderXfrm(context.master, ph))
            : null);
        const paragraphs = readParagraphs(body);
        const hasText = paragraphs.some((p) =>
          p.runs.some((run) => run.text.trim()),
        );
        const fill = solidColor(child(shape, "spPr"));
        if (!box || (!hasText && !fill)) break;
        const isTitle = ph ? sameKind(ph.type, "title") : false;
        const anchor = child(body, "bodyPr")?.getAttribute("anchor");
        items.push({
          kind: "text",
          ...transform(box.x, box.y, box.w, box.h),
          paragraphs: hasText ? paragraphs : [],
          defaultSize: isTitle ? 40 : 18,
          fill,
          anchor:
            anchor === "ctr" ? "middle" : anchor === "b" ? "bottom" : "top",
        });
        break;
      }
      case "pic": {
        const box = xfrmOf(shape);
        const embed = attr(find(child(shape, "blipFill"), "blip"), "embed");
        const rel = embed ? context.rels.get(embed) : undefined;
        if (!box || !rel || rel.external) break;
        const description =
          find(child(shape, "nvPicPr"), "cNvPr")?.getAttribute("descr") ?? "";
        items.push({
          kind: "image",
          ...transform(box.x, box.y, box.w, box.h),
          path: rel.target,
          alt: description,
        });
        break;
      }
      case "graphicFrame": {
        const xfrm = child(shape, "xfrm");
        const off = child(xfrm, "off");
        const ext = child(xfrm, "ext");
        const table = find(shape, "tbl");
        if (!off || !ext || !table) break;
        const rows = children(table, "tr").map((row) =>
          children(row, "tc").map((cell) =>
            readParagraphs(child(cell, "txBody"))
              .map((p) => p.runs.map((run) => run.text).join(""))
              .join("\n"),
          ),
        );
        items.push({
          kind: "table",
          ...transform(
            num(off.getAttribute("x")),
            num(off.getAttribute("y")),
            num(ext.getAttribute("cx")),
            num(ext.getAttribute("cy")),
          ),
          rows,
        });
        break;
      }
      case "grpSp": {
        const props = child(shape, "grpSpPr");
        const xfrm = child(props, "xfrm");
        const off = child(xfrm, "off");
        const ext = child(xfrm, "ext");
        const chOff = child(xfrm, "chOff");
        const chExt = child(xfrm, "chExt");
        if (!off || !ext || !chOff || !chExt) {
          walk(shape, transform, context, items);
          break;
        }
        const sx =
          num(ext.getAttribute("cx")) / (num(chExt.getAttribute("cx")) || 1);
        const sy =
          num(ext.getAttribute("cy")) / (num(chExt.getAttribute("cy")) || 1);
        const ox = num(off.getAttribute("x"));
        const oy = num(off.getAttribute("y"));
        const cx = num(chOff.getAttribute("x"));
        const cy = num(chOff.getAttribute("y"));
        walk(
          shape,
          (x, y, w, h) =>
            transform(ox + (x - cx) * sx, oy + (y - cy) * sy, w * sx, h * sy),
          context,
          items,
        );
        break;
      }
      default:
        break;
    }
  }
}

function notesText(files: Files, rels: Map<string, Relationship>): string {
  const notes = [...rels.values()].find((rel) => rel.type.endsWith(REL_NOTES));
  if (!notes) return "";
  const doc = xml(files, notes.target);
  const parts: string[] = [];
  for (const shape of findAll(doc, "sp")) {
    const ph = placeholderOf(shape);
    if (ph?.type !== "body") continue;
    for (const p of readParagraphs(child(shape, "txBody")))
      parts.push(p.runs.map((run) => run.text).join(""));
  }
  return parts.join("\n").trim();
}

function partOf(
  files: Files,
  rels: Map<string, Relationship>,
  type: string,
): { path: string; doc: Document | null } | null {
  const rel = [...rels.values()].find((entry) => entry.type.endsWith(type));
  return rel ? { path: rel.target, doc: xml(files, rel.target) } : null;
}

export function parsePptx(files: Files): Presentation {
  const presentation = xml(files, "ppt/presentation.xml");
  if (!presentation) throw new Error("No ppt/presentation.xml");
  const size = find(presentation, "sldSz");
  const slideW = num(size?.getAttribute("cx") ?? null, 9_144_000);
  const slideH = num(size?.getAttribute("cy") ?? null, 6_858_000);
  const presRels = relationships(files, "ppt/presentation.xml");
  const order = findAll(presentation, "sldId")
    .map((entry) => presRels.get(relId(entry) ?? ""))
    .filter((rel): rel is Relationship =>
      Boolean(rel?.type.endsWith(REL_SLIDE)),
    );

  const transform: Transform = (x, y, w, h) => ({
    x: x / slideW,
    y: y / slideH,
    w: w / slideW,
    h: h / slideH,
  });

  const slides = order.map((rel, index): Slide => {
    const doc = xml(files, rel.target);
    const rels = relationships(files, rel.target);
    const layout = partOf(files, rels, REL_LAYOUT);
    const master = layout
      ? partOf(files, relationships(files, layout.path), REL_MASTER)
      : null;
    const items: SlideItem[] = [];
    const tree = find(doc, "spTree");
    if (tree)
      walk(
        tree,
        transform,
        { rels, layout: layout?.doc ?? null, master: master?.doc ?? null },
        items,
      );
    const background =
      solidColor(find(find(doc, "bg"), "bgPr")) ??
      solidColor(find(find(layout?.doc, "bg"), "bgPr")) ??
      solidColor(find(find(master?.doc, "bg"), "bgPr"));
    return {
      number: index + 1,
      items,
      notes: notesText(files, rels),
      background,
      hidden: doc?.documentElement.getAttribute("show") === "0",
    };
  });

  return {
    width: slideW / EMU_PER_POINT,
    height: slideH / EMU_PER_POINT,
    slides,
  };
}
