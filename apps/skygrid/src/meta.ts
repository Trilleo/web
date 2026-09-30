import type { GameMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: GameMeta = {
  slug: "skygrid",
  name: "Skygrid",
  description:
    "A sky-island MMO drawn in text: gather, craft, level skills, run minions and trade with other players.",
  status: "in-progress",
  shape: "triangle",
};
