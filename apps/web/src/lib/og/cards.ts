/**
 * Which card each share image URL draws: /og/site.png, /og/posts/<slug>.png and
 * /og/tools/<slug>.png. The pages link them through ogImagePath, with the same
 * card, so the `v` in their URLs matches.
 */
import { findPublicPost, listPublicPosts, toBlogPost } from "../blog/store";
import type { Database } from "@trilleo/db";
import { numberPosts } from "../posts";
import {
  SITE_CARD,
  ogImagePath,
  postCard,
  toolCard,
  type OgCard,
} from "../seo";
import { findTool } from "../tools/registry";

export interface ResolvedCard {
  card: OgCard;
  /** Its current URL, `?v=` included. */
  href: string;
}

/** `database` is only opened for posts: the site's and tools' cards don't need it. */
export async function resolveCard(
  database: () => Promise<Database>,
  path: string,
  now = new Date(),
): Promise<ResolvedCard | undefined> {
  const resolved = (card: OgCard): ResolvedCard => ({
    card,
    href: ogImagePath(path, card),
  });
  if (path === "site") return resolved(SITE_CARD);

  const [kind, slug, ...rest] = path.split("/");
  if (!slug || rest.length > 0) return undefined;
  if (kind === "tools") {
    const tool = findTool(slug);
    return tool && tool.status !== "planned"
      ? resolved(toolCard(tool))
      : undefined;
  }
  if (kind === "posts") {
    // Only public posts, by their current slug (drafts' previews use the site card).
    const db = await database();
    const lookup = await findPublicPost(db, slug, now);
    if (lookup.found !== "post") return undefined;
    const post = toBlogPost(lookup.post, now);
    const number = numberPosts(await listPublicPosts(db, now)).get(post.id);
    return resolved(postCard(post, number ?? "—"));
  }
  return undefined;
}
