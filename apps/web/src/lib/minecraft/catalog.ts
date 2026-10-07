/**
 * The Minecraft platform's fixed vocabulary: project types (and their URLs), editions,
 * loaders, licences, link kinds, the files each type takes, and the limits. Pure data
 * plus small lookups; the store and the pages read it.
 */
import type {
  McChannel,
  McDependencyKind,
  McEdition,
  McProjectState,
  McProjectType,
} from "@trilleo/db";

export interface ProjectTypeInfo {
  type: McProjectType;
  /** The listing's URL segment: /minecraft/<segment>/. */
  segment: string;
  /** "Mod" */
  label: string;
  /** "Mods" */
  plural: string;
  /** One line under the listing's title. */
  blurb: string;
  /** Extensions (lowercase, no dot) a release's main file may have. */
  extensions: readonly string[];
  /** Loaders or platforms to pick from; empty when the type has none. */
  loaders: readonly string[];
  /** Whether a release must name at least one loader. */
  needsLoader: boolean;
  /** Short code for cards ("MOD"). */
  code: string;
  /**
   * The listing title's width in em, with its period and a little room
   * (DisplayTitle's `fit`, so long ones shrink instead of overflowing).
   */
  titleFit: number;
}

export const PROJECT_TYPES: readonly ProjectTypeInfo[] = [
  {
    type: "mod",
    segment: "mods",
    label: "Mod",
    plural: "Mods",
    blurb:
      "Changes to the game itself, for Fabric, Forge, NeoForge and Quilt, or Bedrock add-ons.",
    extensions: ["jar", "mcaddon", "mcpack"],
    loaders: ["fabric", "forge", "neoforge", "quilt"],
    needsLoader: false,
    code: "MOD",
    titleFit: 2.95,
  },
  {
    type: "plugin",
    segment: "plugins",
    label: "Plugin",
    plural: "Plugins",
    blurb:
      "Server plugins for Paper, Spigot, Bukkit, Purpur, Folia and proxies.",
    extensions: ["jar"],
    loaders: [
      "paper",
      "spigot",
      "bukkit",
      "purpur",
      "folia",
      "velocity",
      "bungeecord",
    ],
    needsLoader: true,
    code: "PLG",
    titleFit: 3.65,
  },
  {
    type: "world",
    segment: "worlds",
    label: "World",
    plural: "Worlds",
    blurb:
      "Maps to play: adventures, parkour, puzzles, survival starts and showcases.",
    extensions: ["zip", "mcworld", "mctemplate"],
    loaders: [],
    needsLoader: false,
    code: "WLD",
    titleFit: 3.65,
  },
  {
    type: "build",
    segment: "builds",
    label: "Build",
    plural: "Builds",
    blurb: "Structures and schematics to paste into your own world.",
    extensions: [
      "litematic",
      "schem",
      "schematic",
      "nbt",
      "mcstructure",
      "zip",
    ],
    loaders: [],
    needsLoader: false,
    code: "BLD",
    titleFit: 3.2,
  },
  {
    type: "resource_pack",
    segment: "resource-packs",
    label: "Resource pack",
    plural: "Resource packs",
    blurb: "Textures, models, sounds, fonts and shaders.",
    extensions: ["zip", "mcpack"],
    loaders: [],
    needsLoader: false,
    code: "RES",
    titleFit: 7.5,
  },
  {
    type: "data_pack",
    segment: "data-packs",
    label: "Data pack",
    plural: "Data packs",
    blurb: "Recipes, loot, functions and world generation, without mods.",
    extensions: ["zip", "mcpack"],
    loaders: [],
    needsLoader: false,
    code: "DAT",
    titleFit: 5.35,
  },
];

const BY_TYPE = new Map(PROJECT_TYPES.map((info) => [info.type, info]));
const BY_SEGMENT = new Map(PROJECT_TYPES.map((info) => [info.segment, info]));

export function typeInfo(type: McProjectType): ProjectTypeInfo {
  const info = BY_TYPE.get(type);
  if (!info) throw new Error(`Unknown project type: ${type}`);
  return info;
}

export function typeFromSegment(segment: string): ProjectTypeInfo | undefined {
  return BY_SEGMENT.get(segment);
}

export function isProjectType(value: string): value is McProjectType {
  return BY_TYPE.has(value as McProjectType);
}

/** Every extension a release file may have, for the storage purpose. */
export const RELEASE_EXTENSIONS: readonly string[] = [
  ...new Set(PROJECT_TYPES.flatMap((info) => info.extensions)),
].sort();

/** Build files the browser can read blocks from, for the 3D preview. */
export const PREVIEWABLE_EXTENSIONS: readonly string[] = [
  "litematic",
  "schem",
  "nbt",
  "mcstructure",
];

/** Programs people run: every upload waits for the admin. */
export const ALWAYS_REVIEWED_EXTENSIONS: readonly string[] = ["jar"];

/** Gallery images: raster formats the files domain serves inline. */
export const GALLERY_EXTENSIONS: readonly string[] = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "avif",
];

export const EDITIONS: readonly { value: McEdition; label: string }[] = [
  { value: "java", label: "Java Edition" },
  { value: "bedrock", label: "Bedrock Edition" },
  { value: "both", label: "Java & Bedrock" },
];

export function editionLabel(edition: McEdition): string {
  return EDITIONS.find((entry) => entry.value === edition)?.label ?? edition;
}

export const LOADER_LABELS: Readonly<Record<string, string>> = {
  fabric: "Fabric",
  forge: "Forge",
  neoforge: "NeoForge",
  quilt: "Quilt",
  paper: "Paper",
  spigot: "Spigot",
  bukkit: "Bukkit",
  purpur: "Purpur",
  folia: "Folia",
  velocity: "Velocity",
  bungeecord: "BungeeCord",
};

export function loaderLabel(loader: string): string {
  return LOADER_LABELS[loader] ?? loader;
}

export const CHANNELS: readonly { value: McChannel; label: string }[] = [
  { value: "release", label: "Release" },
  { value: "beta", label: "Beta" },
  { value: "alpha", label: "Alpha" },
];

export function channelLabel(channel: McChannel): string {
  return CHANNELS.find((entry) => entry.value === channel)?.label ?? channel;
}

export const STATES: readonly {
  value: McProjectState;
  label: string;
  hint: string;
}[] = [
  { value: "draft", label: "Draft", hint: "Only you can see it." },
  {
    value: "public",
    label: "Public",
    hint: "Listed and searchable once a release is published.",
  },
  {
    value: "unlisted",
    label: "Unlisted",
    hint: "Anyone with the link, once a release is published. Not listed or indexed.",
  },
  {
    value: "archived",
    label: "Archived",
    hint: "Still public, marked as no longer updated.",
  },
];

export function stateLabel(state: McProjectState): string {
  return STATES.find((entry) => entry.value === state)?.label ?? state;
}

export const DEPENDENCY_KINDS: readonly {
  value: McDependencyKind;
  label: string;
}[] = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "incompatible", label: "Incompatible" },
  { value: "embedded", label: "Included" },
];

export function dependencyKindLabel(kind: McDependencyKind): string {
  return DEPENDENCY_KINDS.find((entry) => entry.value === kind)?.label ?? kind;
}

export interface LicenseInfo {
  id: string;
  label: string;
  url: string | null;
}

/** Licences creators pick from; "custom" takes their own text. */
export const LICENSES: readonly LicenseInfo[] = [
  { id: "ARR", label: "All rights reserved", url: null },
  {
    id: "CC-BY-4.0",
    label: "CC BY 4.0",
    url: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    id: "CC-BY-SA-4.0",
    label: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    id: "CC-BY-NC-4.0",
    label: "CC BY-NC 4.0",
    url: "https://creativecommons.org/licenses/by-nc/4.0/",
  },
  {
    id: "CC-BY-NC-SA-4.0",
    label: "CC BY-NC-SA 4.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },
  {
    id: "CC0-1.0",
    label: "CC0 (public domain)",
    url: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  { id: "MIT", label: "MIT", url: "https://opensource.org/license/mit" },
  {
    id: "Apache-2.0",
    label: "Apache 2.0",
    url: "https://www.apache.org/licenses/LICENSE-2.0",
  },
  {
    id: "GPL-3.0",
    label: "GPL 3.0",
    url: "https://www.gnu.org/licenses/gpl-3.0.html",
  },
  {
    id: "LGPL-3.0",
    label: "LGPL 3.0",
    url: "https://www.gnu.org/licenses/lgpl-3.0.html",
  },
  {
    id: "MPL-2.0",
    label: "MPL 2.0",
    url: "https://www.mozilla.org/MPL/2.0/",
  },
  { id: "custom", label: "Custom licence", url: null },
];

export function licenseInfo(id: string): LicenseInfo | undefined {
  return LICENSES.find((entry) => entry.id === id);
}

export const LINK_KINDS: readonly { value: string; label: string }[] = [
  { value: "source", label: "Source code" },
  { value: "issues", label: "Issues" },
  { value: "wiki", label: "Wiki" },
  { value: "discord", label: "Discord" },
  { value: "website", label: "Website" },
  { value: "donate", label: "Donate" },
];

export function linkKindLabel(kind: string): string {
  return LINK_KINDS.find((entry) => entry.value === kind)?.label ?? "Link";
}

export const MC_LIMITS = {
  name: 60,
  summary: 160,
  description: 20_000,
  tags: 8,
  tag: 24,
  links: 6,
  linkUrl: 300,
  licenseText: 2000,
  slug: 48,
  version: 32,
  releaseTitle: 80,
  changelog: 10_000,
  gameVersions: 60,
  dependencies: 20,
  dependencyName: 80,
  /** Images in one project's gallery. */
  gallery: 12,
  caption: 140,
  /** Extra files beside a release's main file. */
  extraFiles: 4,
  /** Projects one account can have (the admin: no limit). */
  projectsPerAccount: 50,
  /** Releases one account can create per rolling day. */
  releasesPerDay: 30,
  /** Gallery images one account can add per rolling day. */
  imagesPerDay: 60,
} as const;

/** Gallery images can be up to this big. */
export const GALLERY_MAX_BYTES = 10_000_000;

/** Reports from established accounts that hide a project until the admin looks. */
export const PROJECT_REPORTS_TO_HIDE = 3;

/** The notice Mojang's usage guidelines ask for. */
export const MOJANG_NOTICE =
  "Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.";
