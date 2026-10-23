/**
 * The docs' pages as HTML, rendered with the blog's Markdown renderer (Shiki for code,
 * slugged heading ids) and kept per origin, since the routes only change with a
 * release.
 */
import type { PostHeading } from "@trilleo/db";
import { renderPost } from "../../blog/render";
import { stackTables } from "../../post-html";
import { apiOrigin, siteOrigin } from "../host";
import type { Route } from "../registry";
import type { DocContext } from "./context";
import type { DocPage } from "./pages";

export function docContext(url: URL): DocContext {
  return { api: apiOrigin(url), site: siteOrigin(url) };
}

const cache = new Map<string, Promise<{ html: string; toc: PostHeading[] }>>();

export function renderDocPage(
  page: DocPage,
  context: DocContext,
  routes: readonly Route[],
): Promise<{ html: string; toc: PostHeading[] }> {
  const key = `${context.api} ${page.path}`;
  // `pnpm dev` renders afresh, so edits to the docs show up without a restart.
  let rendered = import.meta.env.DEV ? undefined : cache.get(key);
  if (!rendered) {
    rendered = renderPost(page.markdown(context, routes)).then(
      ({ html, toc }) => ({ html: stackTables(html), toc }),
    );
    rendered.catch(() => cache.delete(key));
    cache.set(key, rendered);
  }
  return rendered;
}
