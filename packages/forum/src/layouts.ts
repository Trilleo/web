/**
 * How a forum's topics read, chosen per forum (forums.layout). A new layout is an
 * entry here plus its rendering in apps/web's components/forum/; until it's built it
 * stays `ready: false`, which the admin sees but can't pick.
 */
export interface ForumLayout {
  id: string;
  label: string;
  description: string;
  ready: boolean;
}

export const FORUM_LAYOUTS = [
  {
    id: "classic",
    label: "Classic",
    description: "Posts in the order they were written, page by page.",
    ready: true,
  },
  {
    id: "qa",
    label: "Questions & answers",
    description:
      "The first post asks; answers are voted up or down, and the asker accepts one.",
    ready: false,
  },
  {
    id: "threaded",
    label: "Threaded",
    description: "Replies nest under the post they answer.",
    ready: false,
  },
] as const satisfies readonly ForumLayout[];

export type ForumLayoutId = (typeof FORUM_LAYOUTS)[number]["id"];

export const DEFAULT_LAYOUT: ForumLayoutId = "classic";

export function forumLayout(id: string): ForumLayout {
  return FORUM_LAYOUTS.find((layout) => layout.id === id) ?? FORUM_LAYOUTS[0];
}

/** A layout the admin may choose now. */
export function isReadyLayout(id: string): id is ForumLayoutId {
  return FORUM_LAYOUTS.some((layout) => layout.id === id && layout.ready);
}
