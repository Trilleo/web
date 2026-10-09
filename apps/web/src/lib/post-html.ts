/** Build-time transforms of a post's rendered HTML. */
import type { Element, ElementContent, Root } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { toString } from "hast-util-to-string";
import { SKIP, visit } from "unist-util-visit";

function isElement(node: unknown, tagName?: string): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as { type?: unknown }).type === "element" &&
    (tagName === undefined || (node as Element).tagName === tagName)
  );
}

/** Inline content of each footnote (its first paragraph, minus the "↩" back link), by id. */
function collectFootnotes(tree: Root): Map<string, ElementContent[]> {
  const notes = new Map<string, ElementContent[]>();
  visit(tree, "element", (node) => {
    const id = node.properties.id;
    if (node.tagName !== "li" || typeof id !== "string" || !id.includes("fn-"))
      return;
    const paragraph = node.children.find((child) => isElement(child, "p"));
    if (!paragraph) return;
    notes.set(
      id,
      paragraph.children.filter(
        (child) =>
          !(
            isElement(child, "a") &&
            child.properties.dataFootnoteBackref !== undefined
          ),
      ),
    );
  });
  return notes;
}

/**
 * After each footnote reference, inserts a copy of the note as a side note, which the
 * prose styles float into the right margin on wide screens. The side notes are visual
 * duplicates: assistive tech and narrower screens use the footnotes list, so they're
 * aria-hidden, their links leave the tab order, and search skips them.
 */
export function addSidenotes(html: string): string {
  const tree = fromHtml(html, { fragment: true });
  const notes = collectFootnotes(tree);
  if (notes.size === 0) return html;

  visit(tree, "element", (node, index, parent) => {
    if (node.tagName !== "sup" || !parent || index === undefined) return;
    const ref = node.children.find(
      (child): child is Element =>
        isElement(child, "a") && child.properties.dataFootnoteRef !== undefined,
    );
    const target =
      typeof ref?.properties.href === "string"
        ? ref.properties.href.slice(1)
        : "";
    const content = notes.get(target);
    if (!ref || !content) return;

    const copy = structuredClone(content);
    visit({ type: "root", children: copy }, "element", (child) => {
      if (child.tagName === "a") child.properties.tabIndex = -1;
    });

    const sidenote: Element = {
      type: "element",
      tagName: "span",
      properties: {
        className: ["sidenote"],
        ariaHidden: "true",
      },
      children: [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["sidenote-number"] },
          children: [{ type: "text", value: `${toString(ref)} — ` }],
        },
        ...copy,
      ],
    };
    parent.children.splice(index + 1, 0, sidenote);
    return [SKIP, index + 2];
  });

  return toHtml(tree);
}

/** Rewrites root-relative href/src (e.g. "/writing/x/") to absolute URLs, for feeds. */
export function absolutizeUrls(html: string, site: string | URL): string {
  const tree = fromHtml(html, { fragment: true });
  visit(tree, "element", (node) => {
    for (const key of ["href", "src"] as const) {
      const value = node.properties[key];
      if (
        typeof value === "string" &&
        value.startsWith("/") &&
        !value.startsWith("//")
      ) {
        node.properties[key] = new URL(value, site).href;
      }
    }
  });
  return toHtml(tree);
}

/**
 * Lets tables stack on phones: a table with a header row gets `data-stack`, and each
 * body cell a `data-label` with its column's heading, which .prose shows above the
 * cell when the columns are too narrow to sit side by side.
 */
export function stackTables(html: string): string {
  if (!html.includes("<table")) return html;
  const tree = fromHtml(html, { fragment: true });
  visit(tree, "element", (table) => {
    if (table.tagName !== "table") return;
    const headings: string[] = [];
    visit(table, "element", (node) => {
      if (node.tagName === "thead") {
        visit(node, "element", (cell) => {
          if (cell.tagName === "th") headings.push(toString(cell).trim());
        });
        return SKIP;
      }
      return undefined;
    });
    if (headings.length === 0) return SKIP;
    table.properties.dataStack = "";
    visit(table, "element", (node) => {
      if (node.tagName === "thead") return SKIP;
      if (node.tagName !== "tr") return undefined;
      node.children
        .filter(
          (cell): cell is Element =>
            isElement(cell, "td") || isElement(cell, "th"),
        )
        .forEach((cell, column) => {
          const label = headings[column];
          if (label) cell.properties.dataLabel = label;
        });
      return SKIP;
    });
    return SKIP;
  });
  return toHtml(tree);
}
