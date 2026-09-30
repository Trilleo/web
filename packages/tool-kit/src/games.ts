import type { ToolShape, ToolStatus } from "./meta";

/** What the site needs to know about a game: how to list it (/games, the home page). */
export interface GameMeta {
  /** Its URL: /games/<slug>/. Lowercase, dashes. */
  slug: string;
  name: string;
  /** One line: what it is and why you'd play it. */
  description: string;
  status: ToolStatus;
  shape: ToolShape;
}
