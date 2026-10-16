/**
 * Every component, and the sets wikis choose from. A new component: write its module
 * (src/components/), add it here, give it a test, and style its classes in
 * apps/web/src/styles/wiki.css. A new set: add it to COMPONENT_SETS too.
 */
import { CALCULATOR_COMPONENTS } from "./components/calculators";
import { CORE_COMPONENTS } from "./components/core";
import { MENU_COMPONENTS } from "./components/menu";
import { MINECRAFT_COMPONENTS } from "./components/minecraft";
import type { ComponentSet, WikiComponent } from "./types";

export const COMPONENT_SETS: readonly ComponentSet[] = [
  {
    id: "core",
    label: "Core",
    description:
      "Infoboxes, notices, tabs, collapsible sections, navboxes, columns, badges, keys, calculators and cost tables.",
    always: true,
  },
  {
    id: "minecraft",
    label: "Minecraft",
    description:
      "Minecraft text with § codes, items described on Item: pages with the game's tooltips, inventories, plugin menus drawn with pixel icons, recipes and a raw-materials calculator.",
  },
];

export const COMPONENTS: readonly WikiComponent[] = [
  ...CORE_COMPONENTS,
  ...CALCULATOR_COMPONENTS,
  ...MINECRAFT_COMPONENTS,
  ...MENU_COMPONENTS,
];

/** The sets a wiki ends up with: what it chose (known ones only), plus the ones every wiki has. */
export function effectiveSets(chosen: readonly string[]): Set<string> {
  const known = new Set(COMPONENT_SETS.map((set) => set.id));
  const sets = new Set(chosen.filter((id) => known.has(id)));
  for (const set of COMPONENT_SETS) if (set.always) sets.add(set.id);
  return sets;
}

/** The components a wiki can use, in the registry's order. */
export function componentsFor(sets: ReadonlySet<string>): WikiComponent[] {
  return COMPONENTS.filter((component) => sets.has(component.set));
}
