/**
 * Which card each share image URL draws: /og/site.png, /og/posts/<slug>.png,
 * /og/tools/<slug>.png, /og/games/<slug>.png, /og/minecraft.png and
 * /og/minecraft/<slug>.png. The pages link them through ogImagePath, with the same
 * card, so the `v` in their URLs matches.
 */
import { findPublicPost, listPublicPosts, toBlogPost } from "../blog/store";
import type { Database } from "@trilleo/db";
import { numberPosts } from "../posts";
import {
  SITE_CARD,
  gameCard,
  ogImagePath,
  postCard,
  toolCard,
  type OgCard,
} from "../seo";
import { findGame } from "../games/registry";
import { findTool } from "../tools/registry";
import { compareVersions } from "../minecraft/game-versions";
import { SECTION_CARD, projectCard } from "../minecraft/public";
import {
  ANONYMOUS,
  findProject,
  isVisible,
  releasesOf,
} from "../minecraft/store";

export interface ResolvedCard {
  card: OgCard;
  /** Its current URL, `?v=` included. */
  href: string;
}

/** `database` is only opened for posts and projects: the other cards don't need it. */
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
  if (path === "minecraft") return resolved(SECTION_CARD);

  const [kind, slug, ...rest] = path.split("/");
  if (!slug || rest.length > 0) return undefined;
  if (kind === "tools") {
    const tool = findTool(slug);
    return tool && tool.status !== "planned"
      ? resolved(toolCard(tool))
      : undefined;
  }
  if (kind === "games") {
    const game = findGame(slug);
    return game && game.status !== "planned"
      ? resolved(gameCard(game))
      : undefined;
  }
  if (kind === "minecraft") {
    // Public projects (listed or unlisted), by their current slug.
    const db = await database();
    const found = await findProject(db, slug);
    if (!found || found.moved || !isVisible(found.project, found.owner))
      return undefined;
    const live = await releasesOf(db, found.project, ANONYMOUS);
    const versions = [
      ...new Set(live.flatMap((entry) => entry.release.gameVersions)),
    ].sort(compareVersions);
    return resolved(projectCard(found.project, found.owner, versions));
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
