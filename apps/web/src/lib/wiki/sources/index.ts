/**
 * Pages generated from code: a wiki with a `source` gets these on top of its written
 * pages. They're read-only (change the code, not the page), rendered with the same
 * Markdown as written pages, and can't be shadowed by one: their titles are taken.
 * Adding a source: write a module like skygrid.ts and list it in SOURCES.
 */
import { skygridSource } from "./skygrid";

export interface GeneratedPage {
  title: string;
  /** Wiki Markdown, links and categories included. */
  body: string;
}

export interface WikiSource {
  id: string;
  /** Shown on its pages: "Generated from {label}." */
  label: string;
  /** Where the data lives, for the "edit" hint. */
  origin: string;
  pages(): readonly GeneratedPage[];
}

export const SOURCES: Readonly<Record<string, WikiSource>> = {
  [skygridSource.id]: skygridSource,
};

export function sourceFor(id: string | null): WikiSource | null {
  return id ? (SOURCES[id] ?? null) : null;
}
