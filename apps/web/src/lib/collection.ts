import { getCollection, type CollectionEntry } from "astro:content";
import { isVisible, sortPosts } from "./posts";

export type Post = CollectionEntry<"writing">;

/**
 * Drafts appear in `pnpm dev` and in the e2e build (INCLUDE_DRAFTS=true), never in a
 * production build.
 */
export const includeDrafts =
  import.meta.env.DEV || process.env.INCLUDE_DRAFTS === "true";

/** Visible posts, newest first. Feeds pass `{ includeDrafts: false }` to stay draft-free. */
export async function getPosts(
  options: { includeDrafts?: boolean } = {},
): Promise<Post[]> {
  const all = await getCollection("writing");
  const drafts = options.includeDrafts ?? includeDrafts;
  return sortPosts(all.filter((post) => isVisible(post, drafts)));
}
