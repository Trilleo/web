/**
 * Every component, and the sets wikis choose from. A new component: write its module
 * (src/components/), add it here, give it a test, and style its classes in
 * apps/web/src/styles/wiki.css. A new set: add it to COMPONENT_SETS too.
 */
import { CORE_COMPONENTS } from "./components/core";
import type { ComponentSet, WikiComponent } from "./types";

export const COMPONENT_SETS: readonly ComponentSet[] = [
  {
    id: "core",
    label: "Core",
    description:
      "Infoboxes, notices, tabs, collapsible sections, navboxes, columns, badges and keys.",
    always: true,
  },
];

export const COMPONENTS: readonly WikiComponent[] = [...CORE_COMPONENTS];

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
