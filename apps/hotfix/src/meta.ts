import type { GameMeta } from "@trilleo/tool-kit";

/** Kept separate from the app, so the server can read it without loading React. */
export const meta: GameMeta = {
  slug: "hotfix",
  name: "Hotfix",
  description:
    "A one-button runner: a small robot sprints through the codebase, over bugs and under drones, to ship the fix before the deploy.",
  status: "in-progress",
  icon: "robot",
};
