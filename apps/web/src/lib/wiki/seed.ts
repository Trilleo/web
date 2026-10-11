/**
 * Wikis the site ships with. Each is created (with its starting pages) the first
 * time the wiki is used on a database that doesn't have it; after that the database
 * owns it, and nothing here overwrites what people wrote. Generated pages (the
 * `source`) always come from the code.
 */
import type { Database } from "@trilleo/db";
import { meta as skygridMeta } from "@trilleo/game-skygrid/meta";
import { createWiki, getWiki, savePage, type WikiInput } from "./store";

interface BuiltInWiki {
  wiki: WikiInput & { source: string | null };
  /** Written pages, saved as the first revision of each. */
  pages: { title: string; body: string }[];
}

const SKYGRID: BuiltInWiki = {
  wiki: {
    slug: "skygrid",
    name: "Skygrid",
    code: "SKY",
    description: skygridMeta.description,
    kind: "game",
    visibility: "public",
    homeTitle: "Main Page",
    source: "skygrid",
    nav: [
      {
        label: "Start here",
        links: [
          { label: "Main Page", page: "Main Page" },
          { label: "Getting started", page: "Getting started" },
        ],
      },
      {
        label: "Reference",
        links: [
          { label: "Items", page: "Items" },
          { label: "Recipes", page: "Recipes" },
          { label: "Skills", page: "Skills" },
          { label: "Collections", page: "Collections" },
          { label: "Mobs", page: "Mobs" },
          { label: "Islands", page: "Islands" },
          { label: "Armor sets", page: "Armor sets" },
          { label: "Merchant", page: "Merchant" },
        ],
      },
    ],
  },
  pages: [
    {
      title: "Main Page",
      body: `Welcome to the **Skygrid wiki**, the reference for [Skygrid](https://www.trilleo.net/games/skygrid/): a sky-island MMO drawn in text, where you gather, craft, level skills, run minions and trade with other players.

## Start here

- [[Getting started]]: your first island, first tools and first minion.
- [[Skills]]: Farming, Mining, Foraging, Fishing and Combat.
- [[Collections]]: what gathering unlocks.

## Reference

The reference pages are generated from the game's own data, so they're always up to date: [[Items]], [[Recipes]], [[Mobs]], [[Islands]], [[Armor sets]] and the [[Merchant]].

## Places

[[Your Island]] · [[The Hub]] · [[Islands|all islands]]
`,
    },
    {
      title: "Getting started",
      body: `A new game starts on [[Your Island]], with nothing in your bag.

## Moving and using things

Walk with the arrow keys (or the arrow pad on a touch screen). **Walking into something uses it**: a tree gets chopped, a crop harvested, ore mined, water fished, the merchant's shop opened. Press E or Space to use what you're facing.

## Your first tools

1. Walk into a tree to chop [[Oak Log]]s.
2. Six of them make a [[Wooden Axe]] (open *Craft*), which chops faster.
3. A [[Wooden Pickaxe]] lets you mine: ore needs a pickaxe, and better ore a better one.

## Minions

Every resource has a collection (see [[Collections]]). Gather 50 [[Wheat]] and the [[Wheat Minion]] unlocks: place it on one of your island's minion slots and it farms while you're away.

## Further on

- [[The Hub]] joins the islands; the [[Merchant]] there buys what you gather.
- [[Skills]] level up as you gather and fight; each level adds fortune (more drops).
- [[Mobs]] fight back: bring a sword and [[Armor sets|armor]].

[[Category:Guides]]
`,
    },
  ],
};

export const BUILT_IN_WIKIS: readonly BuiltInWiki[] = [SKYGRID];

let seeded: Promise<void> | undefined;

/** Creates the built-in wikis that are missing (idempotent). */
export async function seedBuiltInWikis(db: Database): Promise<void> {
  for (const builtIn of BUILT_IN_WIKIS) {
    if (await getWiki(db, builtIn.wiki.slug)) continue;
    const created = await createWiki(db, null, builtIn.wiki);
    if (!created.ok) continue;
    for (const page of builtIn.pages) {
      await savePage(db, {
        wiki: created.wiki,
        actor: null,
        title: page.title,
        body: page.body,
        summary: "Starting page",
        minor: false,
        baseRevisionId: null,
        canEditProtected: true,
      });
    }
  }
}

/** Creates the built-in wikis that are missing, once per server. */
export function ensureBuiltInWikis(db: Database): Promise<void> {
  seeded ??= seedBuiltInWikis(db).catch((error: unknown) => {
    seeded = undefined;
    throw error;
  });
  return seeded;
}
