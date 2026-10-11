/**
 * The Skygrid wiki's reference pages, written from the game's own content
 * (@trilleo/game-skygrid/core): items, recipes, minions, skills, collections, mobs,
 * islands. Change the game and these change with it. Written pages (guides,
 * strategy) live in the database and link to these by title.
 */
import {
  BASE_STATS,
  CATCHES,
  COLLECTION_TIERS,
  COMBAT_DAMAGE_PER_LEVEL,
  DEATH_PENALTY,
  ENCHANT_COST,
  FORTUNE_PER_LEVEL,
  ISLANDS,
  ISLAND_MAPS,
  ITEMS,
  LEVEL_XP,
  MAX_LEVEL,
  MINION_KINDS,
  MINION_SPEED,
  MINION_STORAGE,
  MINION_TIERS,
  MOBS,
  NODES,
  RECIPES,
  REGEN_PER_SECOND,
  RESOURCES,
  RESOURCE_IDS,
  SET_BONUSES,
  SHOP,
  SKILLS,
  SKILL_NAMES,
  SKILL_STATS,
  STAT_NAMES,
  collectionReward,
  enchantedId,
  itemName,
  levelReward,
  minionId,
  romanTier,
  type IslandId,
  type ItemDef,
  type ItemId,
  type Recipe,
  type ResourceId,
  type SkillId,
  type Stats,
} from "@trilleo/game-skygrid/core";
import type { GeneratedPage, WikiSource } from ".";

const fmt = (n: number) => n.toLocaleString("en-US");
const seconds = (ms: number) =>
  `${(ms / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })} s`;
const percent = (share: number) =>
  `${(share * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;

function table(headers: string[], rows: string[][]): string {
  const cell = (text: string) => text.replace(/\|/g, "\\|");
  return [
    `| ${headers.map(cell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

/** Wiki link markup inside a table cell needs its bar escaped (table() does that). */
function minionPage(kind: ItemId): string {
  return `${itemName(kind)} Minion`;
}

/** The page an item is described on. */
function pageOf(id: ItemId): string {
  const minion = ITEMS[id]?.minion;
  return minion ? minionPage(minion.kind) : itemName(id);
}

function link(id: ItemId): string {
  const page = pageOf(id);
  const name = itemName(id);
  return page === name ? `[[${name}]]` : `[[${page}|${name}]]`;
}

function inputsText(recipe: Recipe): string {
  return Object.entries(recipe.inputs)
    .map(([id, qty]) => `${fmt(qty)} × ${link(id)}`)
    .join(", ");
}

function unlockText(recipe: Recipe): string {
  if (!recipe.unlock) return "Known from the start";
  const { item, tier } = recipe.unlock;
  return `[[${itemName(item)}#Collection|${itemName(item)} ${romanTier(tier)}]]`;
}

function statsText(stats: Partial<Stats>): string {
  return (Object.entries(stats) as [keyof Stats, number][])
    .map(([stat, value]) => `+${fmt(value)} ${STAT_NAMES[stat]}`)
    .join(", ");
}

function islandsWith(char: string): IslandId[] {
  return ISLANDS.filter((id) =>
    ISLAND_MAPS[id].tiles.some((row) => row.includes(char)),
  );
}

function islandLinks(ids: readonly IslandId[]): string {
  return ids.length === 0
    ? "Nowhere yet"
    : ids.map((id) => `[[${ISLAND_MAPS[id].name}]]`).join(", ");
}

const madeBy = (id: ItemId) => RECIPES.filter((recipe) => recipe.output === id);
const usedIn = (id: ItemId) =>
  RECIPES.filter((recipe) => Object.hasOwn(recipe.inputs, id));

function recipeSection(id: ItemId): string {
  const recipes = madeBy(id);
  if (recipes.length === 0) return "";
  return `## Recipe\n\n${table(
    ["Makes", "Ingredients", "Unlocked by"],
    recipes.map((recipe) => [
      `${fmt(recipe.qty)} × ${itemName(recipe.output)}`,
      inputsText(recipe),
      unlockText(recipe),
    ]),
  )}`;
}

function usesSection(id: ItemId): string {
  const recipes = usedIn(id);
  if (recipes.length === 0) return "";
  return `## Used in\n\n${table(
    ["Item", "Ingredients"],
    recipes.map((recipe) => [link(recipe.output), inputsText(recipe)]),
  )}`;
}

function sellText(item: ItemDef): string {
  return item.price > 0 ? `${fmt(item.price)} coins` : "Can't be sold";
}

const KIND_CATEGORY: Readonly<Record<ItemDef["kind"], string>> = {
  resource: "Resources",
  enchanted: "Enchanted items",
  tool: "Tools",
  minion: "Minions",
  gear: "Gear",
};

function sections(...parts: string[]): string {
  return parts.filter((part) => part.trim() !== "").join("\n\n");
}

function resourcePage(id: ResourceId): GeneratedPage {
  const resource = RESOURCES[id];
  const item = ITEMS[id];
  const nodes = Object.entries(NODES).filter(([, node]) => node.item === id);
  const drops = Object.values(MOBS).filter((mob) =>
    mob.drops.some((drop) => drop.item === id),
  );
  const catches = CATCHES.filter((entry) => entry.item === id);
  const totalWeight = CATCHES.reduce((sum, entry) => sum + entry.weight, 0);

  const sources: string[] = [];
  if (nodes.length > 0) {
    sources.push(
      table(
        [
          "Gathered from",
          "Tool",
          "Skill level",
          "Time",
          "Grows back",
          "XP",
          "Found on",
        ],
        nodes.map(([char, node]) => [
          `\`${char}\` on the map`,
          node.tier > 0
            ? `Tier ${String(node.tier)} ${node.tool}`
            : `Any ${node.tool}, or bare hands`,
          fmt(node.level),
          seconds(node.ms),
          seconds(node.respawn),
          fmt(node.xp),
          islandLinks(islandsWith(char)),
        ]),
      ),
    );
  }
  for (const entry of catches) {
    sources.push(
      `Caught while [[Fishing|fishing]] from level ${fmt(entry.level)}: ${percent(entry.weight / totalWeight)} of catches at most, ${fmt(entry.xp)} XP each.`,
    );
  }
  if (drops.length > 0) {
    sources.push(
      table(
        ["Dropped by", "Chance", "Amount"],
        drops.flatMap((mob) =>
          mob.drops
            .filter((drop) => drop.item === id)
            .map((drop) => [
              `[[${mob.name}]]`,
              percent(drop.chance),
              drop.min === drop.max
                ? fmt(drop.min)
                : `${fmt(drop.min)}–${fmt(drop.max)}`,
            ]),
        ),
      ),
    );
  }
  if ("minionSeconds" in resource)
    sources.push(`Made by the [[${minionPage(id)}]] while you're away.`);

  const collection = table(
    ["Tier", "Collected", "Reward", "Unlocks"],
    COLLECTION_TIERS.map((threshold, index) => {
      const tier = index + 1;
      const unlocks = RECIPES.filter(
        (recipe) => recipe.unlock?.item === id && recipe.unlock.tier === tier,
      ).map((recipe) => link(recipe.output));
      return [
        romanTier(tier),
        fmt(threshold),
        `${fmt(collectionReward(tier))} coins`,
        unlocks.join(", ") || "—",
      ];
    }),
  );

  return {
    title: resource.name,
    body: sections(
      `**${resource.name}** is a [[${SKILL_NAMES[resource.skill]}]] resource in Skygrid. The merchant pays ${sellText(item ?? { name: "", kind: "resource", price: 0 })} for one; ${fmt(ENCHANT_COST)} of them make one [[${itemName(enchantedId(id))}]].`,
      sources.length > 0 ? `## Obtaining\n\n${sources.join("\n\n")}` : "",
      `## Collection\n\nEverything you gather counts towards the ${resource.name} collection (see [[Collections]]).\n\n${collection}`,
      usesSection(id),
      `[[Category:Items]] [[Category:${KIND_CATEGORY.resource}]] [[Category:${SKILL_NAMES[resource.skill]}]]`,
    ),
  };
}

function enchantedPage(id: ResourceId): GeneratedPage {
  const enchanted = enchantedId(id);
  const item = ITEMS[enchanted];
  const name = itemName(enchanted);
  return {
    title: name,
    body: sections(
      `**${name}** is a compressed form of [[${itemName(id)}]]: ${fmt(ENCHANT_COST)} of them in one. The merchant pays ${item ? sellText(item) : "nothing"} for it.`,
      recipeSection(enchanted),
      usesSection(enchanted),
      `[[Category:Items]] [[Category:${KIND_CATEGORY.enchanted}]]`,
    ),
  };
}

function toolPage(id: ItemId, item: ItemDef): GeneratedPage {
  const tool = item.tool;
  const shop = SHOP.find((entry) => entry.item === id);
  const facts = tool
    ? table(
        [
          "Type",
          "Tier",
          "Speed",
          "Fortune",
          "Sells for",
          "Buy from the merchant",
        ],
        [
          [
            tool.type,
            fmt(tool.tier),
            `×${fmt(tool.speed)}`,
            `+${fmt(tool.fortune)}%`,
            sellText(item),
            shop ? `${fmt(shop.price)} coins` : "Not sold",
          ],
        ],
      )
    : "";
  return {
    title: item.name,
    body: sections(
      `**${item.name}** is a ${tool?.type ?? "tool"} in Skygrid. Tools of a higher tier work nodes that need them; speed divides gathering time, and fortune adds drops.`,
      facts,
      recipeSection(id),
      usesSection(id),
      `[[Category:Items]] [[Category:${KIND_CATEGORY.tool}]]`,
    ),
  };
}

function gearPage(id: ItemId, item: ItemDef): GeneratedPage {
  const gear = item.gear;
  const set = gear?.set ? SET_BONUSES[gear.set] : undefined;
  const shop = SHOP.find((entry) => entry.item === id);
  return {
    title: item.name,
    body: sections(
      `**${item.name}** is ${gear?.slot === "weapon" ? "a weapon" : `a piece of armor (${gear?.slot ?? "gear"})`} in Skygrid.`,
      gear
        ? table(
            ["Slot", "Stats", "Sells for", "Buy from the merchant"],
            [
              [
                gear.slot,
                statsText(gear.stats),
                sellText(item),
                shop ? `${fmt(shop.price)} coins` : "Not sold",
              ],
            ],
          )
        : "",
      set
        ? `Part of the [[Armor sets#${set.name}|${set.name}]] set: wearing all four pieces adds ${statsText(set.stats)}.`
        : "",
      recipeSection(id),
      usesSection(id),
      `[[Category:Items]] [[Category:${KIND_CATEGORY.gear}]] [[Category:${gear?.slot === "weapon" ? "Weapons" : "Armor"}]]`,
    ),
  };
}

function minionKindPage(kind: ResourceId): GeneratedPage {
  const resource = RESOURCES[kind];
  const base = "minionSeconds" in resource ? resource.minionSeconds : 0;
  const tiers = Array.from({ length: MINION_TIERS }, (_, index) => index + 1);
  return {
    title: minionPage(kind),
    body: sections(
      `A **${minionPage(kind)}** makes [[${resource.name}]] on your island while you're away. Place it on a minion slot; it stops when its storage is full. Higher tiers are faster and hold more.`,
      `## Tiers\n\n${table(
        ["Tier", "One every", "Holds", "Ingredients", "Unlocked by"],
        tiers.map((tier) => {
          const recipe = RECIPES.find(
            (entry) => entry.output === minionId(kind, tier),
          );
          return [
            romanTier(tier),
            seconds(base * 1000 * (MINION_SPEED[tier - 1] ?? 1)),
            fmt(MINION_STORAGE[tier - 1] ?? 0),
            recipe ? inputsText(recipe) : "—",
            recipe ? unlockText(recipe) : "—",
          ];
        }),
      )}`,
      `[[Category:Items]] [[Category:${KIND_CATEGORY.minion}]]`,
    ),
  };
}

function itemsPage(): GeneratedPage {
  const groups: [string, ItemDef["kind"]][] = [
    ["Resources", "resource"],
    ["Enchanted items", "enchanted"],
    ["Tools", "tool"],
    ["Gear", "gear"],
  ];
  const parts = groups.map(([heading, kind]) => {
    const rows = Object.entries(ITEMS)
      .filter(([, item]) => item.kind === kind)
      .map(([id, item]) => [link(id), sellText(item)]);
    return `## ${heading}\n\n${table(["Item", "Merchant pays"], rows)}`;
  });
  parts.push(
    `## Minions\n\n${MINION_KINDS.map((kind) => `- [[${minionPage(kind)}]]`).join("\n")}`,
  );
  return {
    title: "Items",
    body: sections(
      `Every item in Skygrid, from the game's own data. Each has its own page with where it comes from and what it makes.`,
      ...parts,
      `[[Category:Reference]]`,
    ),
  };
}

function recipesPage(): GeneratedPage {
  return {
    title: "Recipes",
    body: sections(
      `Everything you can craft. Most recipes are unlocked by reaching a collection tier (see [[Collections]]).`,
      table(
        ["Item", "Ingredients", "Unlocked by"],
        RECIPES.map((recipe) => [
          link(recipe.output),
          inputsText(recipe),
          unlockText(recipe),
        ]),
      ),
      `[[Category:Reference]]`,
    ),
  };
}

function skillsPage(): GeneratedPage {
  const levels = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);
  return {
    title: "Skills",
    body: sections(
      `Skygrid has ${fmt(SKILLS.length)} skills: ${SKILLS.map((skill) => `[[${SKILL_NAMES[skill]}]]`).join(", ")}. Each goes up to level ${fmt(MAX_LEVEL)}, and every level adds ${fmt(FORTUNE_PER_LEVEL)}% fortune (more drops) to that skill's gathering.`,
      `## Levels\n\n${table(
        ["Level", "Total XP", "Reward"],
        levels.map((level) => [
          fmt(level),
          fmt(LEVEL_XP[level] ?? 0),
          `${fmt(levelReward(level))} coins`,
        ]),
      )}`,
      `[[Category:Reference]] [[Category:Skills]]`,
    ),
  };
}

function skillPage(skill: SkillId): GeneratedPage {
  const name = SKILL_NAMES[skill];
  const nodes = Object.entries(NODES).filter(
    ([, node]) => node.skill === skill,
  );
  const resources = RESOURCE_IDS.filter((id) => RESOURCES[id].skill === skill);
  const perLevel = statsText(SKILL_STATS[skill]);
  const extra =
    skill === "combat"
      ? ` and ${fmt(COMBAT_DAMAGE_PER_LEVEL)}% more damage`
      : "";
  return {
    title: name,
    body: sections(
      `**${name}** is one of the [[Skills]]. Each level adds ${fmt(FORTUNE_PER_LEVEL)}% fortune to ${name.toLowerCase()} drops, ${perLevel || "no stats"}${extra}.`,
      nodes.length > 0
        ? `## What to gather\n\n${table(
            ["Node", "Gives", "Level", "Tool", "XP"],
            nodes.map(([char, node]) => [
              `\`${char}\``,
              link(node.item),
              fmt(node.level),
              node.tier > 0
                ? `Tier ${String(node.tier)} ${node.tool}`
                : node.tool,
              fmt(node.xp),
            ]),
          )}`
        : "",
      skill === "fishing" ? catchesSection() : "",
      skill === "combat" ? fightingSection() : "",
      resources.length > 0
        ? `## Resources\n\n${resources.map((id) => `- ${link(id)}`).join("\n")}`
        : "",
      `[[Category:Skills]]`,
    ),
  };
}

function collectionsPage(): GeneratedPage {
  return {
    title: "Collections",
    body: sections(
      `Every resource has a collection: the total you've ever gathered of it. Reaching a tier pays coins and often unlocks recipes, listed on each resource's page.`,
      table(
        ["Tier", "Collected", "Reward"],
        COLLECTION_TIERS.map((threshold, index) => [
          romanTier(index + 1),
          fmt(threshold),
          `${fmt(collectionReward(index + 1))} coins`,
        ]),
      ),
      `## Resources\n\n${RESOURCE_IDS.map((id) => `- ${link(id)}`).join("\n")}`,
      `[[Category:Reference]]`,
    ),
  };
}

function mobPage(char: string): GeneratedPage | null {
  const mob = MOBS[char];
  if (!mob) return null;
  return {
    title: mob.name,
    body: sections(
      `The **${mob.name}** is a mob, shown as \`${char}\` on the map. Walk into it to fight; each swing that doesn't kill it is answered.`,
      table(
        ["Health", "Hits for", "XP", "Coins", "Comes back after", "Found on"],
        [
          [
            fmt(mob.hp),
            fmt(mob.damage),
            fmt(mob.xp),
            `${fmt(mob.coins[0])}–${fmt(mob.coins[1])}`,
            seconds(mob.respawn),
            islandLinks(islandsWith(char)),
          ],
        ],
      ),
      `## Drops\n\n${table(
        ["Item", "Chance", "Amount"],
        mob.drops.map((drop) => [
          link(drop.item),
          percent(drop.chance),
          drop.min === drop.max
            ? fmt(drop.min)
            : `${fmt(drop.min)}–${fmt(drop.max)}`,
        ]),
      )}`,
      `[[Category:Mobs]]`,
    ),
  };
}

function mobsPage(): GeneratedPage {
  return {
    title: "Mobs",
    body: sections(
      `What you can fight in Skygrid. See [[Combat#Fighting]] for how fights work.`,
      table(
        ["Mob", "Map", "Health", "Hits for", "XP"],
        Object.entries(MOBS).map(([char, mob]) => [
          `[[${mob.name}]]`,
          `\`${char}\``,
          fmt(mob.hp),
          fmt(mob.damage),
          fmt(mob.xp),
        ]),
      ),
      `[[Category:Reference]]`,
    ),
  };
}

function islandPage(id: IslandId): GeneratedPage {
  const island = ISLAND_MAPS[id];
  const chars = new Set(island.tiles.flat());
  const resources = Object.entries(NODES)
    .filter(([char]) => chars.has(char))
    .map(([char, node]) => `- ${link(node.item)} (\`${char}\`)`);
  const mobs = Object.entries(MOBS)
    .filter(([char]) => chars.has(char))
    .map(([char, mob]) => `- [[${mob.name}]] (\`${char}\`)`);
  const portals = [...new Set(island.portals.map((portal) => portal.to))];
  return {
    title: island.name,
    body: sections(
      `**${island.name}** is one of Skygrid's islands.${portals.length > 0 ? ` Its portals lead to ${portals.map((to) => `[[${ISLAND_MAPS[to].name}]]`).join(", ")}.` : ""}`,
      `## Map\n\n\`\`\`text\n${island.rows.join("\n").replace(/\s+$/gm, "")}\n\`\`\``,
      resources.length > 0 ? `## Resources\n\n${resources.join("\n")}` : "",
      mobs.length > 0 ? `## Mobs\n\n${mobs.join("\n")}` : "",
      island.slots.length > 0
        ? `It has ${fmt(island.slots.length)} minion slots (\`_\`).`
        : "",
      `[[Category:Islands]]`,
    ),
  };
}

function islandsPage(): GeneratedPage {
  return {
    title: "Islands",
    body: sections(
      `Skygrid's world is a set of islands joined by portals (\`>\`).`,
      ISLANDS.map((id) => `- [[${ISLAND_MAPS[id].name}]]`).join("\n"),
      `[[Category:Reference]]`,
    ),
  };
}

function catchesSection(): string {
  const total = CATCHES.reduce((sum, entry) => sum + entry.weight, 0);
  return `## What bites

Walk into water with a rod to cast; reel in the moment something bites. A catch is only possible from its level, so these chances are with everything unlocked.

${table(
  ["Catch", "From level", "Chance", "XP"],
  CATCHES.map((entry) => [
    link(entry.item),
    fmt(entry.level),
    percent(entry.weight / total),
    fmt(entry.xp),
  ]),
)}`;
}

function armorSetsPage(): GeneratedPage {
  return {
    title: "Armor sets",
    body: sections(
      `Wearing all four pieces of a set adds its bonus on top of the pieces' own stats.`,
      ...Object.entries(SET_BONUSES).map(([set, bonus]) => {
        const pieces = Object.entries(ITEMS)
          .filter(([, item]) => item.gear?.set === set)
          .map(([id]) => link(id));
        return `## ${bonus.name}\n\nBonus: ${statsText(bonus.stats)}.\n\nPieces: ${pieces.join(", ")}.`;
      }),
      `[[Category:Reference]] [[Category:Armor]]`,
    ),
  };
}

function merchantPage(): GeneratedPage {
  return {
    title: "Merchant",
    body: sections(
      `The merchant in [[The Hub]] buys anything with a price (see [[Items]]) and sells a few starting tools.`,
      table(
        ["Item", "Price"],
        SHOP.map((entry) => [link(entry.item), `${fmt(entry.price)} coins`]),
      ),
      `[[Category:Reference]]`,
    ),
  };
}

function fightingSection(): string {
  return sections(
    `## Fighting

Fights are exchanges: each swing that doesn't kill a mob is answered by it. Your stats come from your skills, your gear and full [[Armor sets]]. See [[Mobs]] for what you can fight.`,
    table(
      ["Stat", "Without gear"],
      (Object.entries(BASE_STATS) as [keyof Stats, number][]).map(
        ([stat, value]) => [STAT_NAMES[stat], fmt(value)],
      ),
    ),
    `Damage taken is multiplied by 100 / (100 + defense). Health comes back at ${percent(REGEN_PER_SECOND)} of the maximum each second. Dying costs ${percent(DEATH_PENALTY)} of your coins.`,
  );
}

function build(): GeneratedPage[] {
  const pages: GeneratedPage[] = [
    itemsPage(),
    recipesPage(),
    skillsPage(),
    collectionsPage(),
    mobsPage(),
    islandsPage(),
    armorSetsPage(),
    merchantPage(),
  ];
  for (const id of RESOURCE_IDS) {
    pages.push(resourcePage(id), enchantedPage(id));
  }
  for (const [id, item] of Object.entries(ITEMS)) {
    if (item.kind === "tool") pages.push(toolPage(id, item));
    if (item.kind === "gear") pages.push(gearPage(id, item));
  }
  for (const kind of MINION_KINDS) pages.push(minionKindPage(kind));
  for (const skill of SKILLS) pages.push(skillPage(skill));
  for (const char of Object.keys(MOBS)) {
    const page = mobPage(char);
    if (page) pages.push(page);
  }
  for (const id of ISLANDS) pages.push(islandPage(id));
  return pages;
}

let cache: GeneratedPage[] | undefined;

export const skygridSource: WikiSource = {
  id: "skygrid",
  label: "Skygrid's game data",
  origin: "apps/skygrid/src/core/content/",
  pages() {
    cache ??= build();
    return cache;
  },
};
