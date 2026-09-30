import type { GameMeta } from "@trilleo/tool-kit";
import { meta as skygrid } from "@trilleo/game-skygrid/meta";
import type { GameListing } from "../listings";

/** Every game, in listing order: /games and the home page read this. */
export const GAMES: readonly GameMeta[] = [skygrid];

export function gamePath(slug: string): string {
  return `/games/${slug}/`;
}

export function findGame(
  slug: string | undefined,
  games: readonly GameMeta[] = GAMES,
): GameMeta | undefined {
  return games.find((game) => game.slug === slug);
}

/** Games as the cards show them; planned ones aren't linked. */
export function gameListings(
  games: readonly GameMeta[] = GAMES,
): GameListing[] {
  return games.map((game) => ({
    name: game.name,
    description: game.description,
    path: `/games/${game.slug}`,
    status: game.status,
    shape: game.shape,
    href: game.status === "planned" ? null : gamePath(game.slug),
  }));
}
