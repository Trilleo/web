/**
 * Reads what a Minecraft file says about itself, so the release form can fill itself
 * in: a mod's or plugin's name, version, loaders, Minecraft versions and
 * dependencies; a pack's formats; a world's version; a schematic's name and size.
 * Runs in the browser on the dropped file and reads only the entries it needs (a
 * 200 MB world costs a few small reads). Everything is a suggestion: the creator
 * checks the form before saving.
 */
import {
  listZip,
  readZipEntry,
  type ArchiveEntry,
  type ReadRange,
} from "@trilleo/storage";
import {
  getNumber,
  getString,
  get,
  gunzip,
  isGzip,
  readNbt,
  type NbtValue,
} from "./nbt";
import {
  DATA_PACK_FORMATS,
  RESOURCE_PACK_FORMATS,
  atLeast,
  mavenRule,
  packFormatRule,
  semverRule,
  versionOfData,
  type VersionRule,
} from "./versions";

export type DetectedKind =
  "mod" | "plugin" | "resource_pack" | "data_pack" | "world" | "build";

export interface DependencyHint {
  kind: "required" | "optional" | "incompatible";
  /** The other project's id in its own ecosystem ("fabric-api"). */
  id: string;
  name: string;
  /** Where to find it, when we know. */
  url: string | null;
}

export interface FileHints {
  /** "Fabric mod", "Paper plugin", "Resource pack", "Java world", … */
  label: string;
  kind: DetectedKind;
  edition: "java" | "bedrock";
  name?: string;
  version?: string;
  description?: string;
  loaders: string[];
  /** Which Minecraft versions it works with; null when it doesn't say. */
  gameVersions: VersionRule | null;
  dependencies: DependencyHint[];
  /** Other things worth showing ("48 × 32 × 60 blocks", "Depends on Vault"). */
  notes: string[];
}

/** A file's bytes, read in ranges (a Blob/File in the browser). */
export interface Source {
  name: string;
  size: number;
  read: ReadRange;
}

export function blobSource(file: Blob, name: string): Source {
  return {
    name,
    size: file.size,
    read: async (start, end) =>
      new Uint8Array(await file.slice(start, end).arrayBuffer()),
  };
}

// TextDecoder drops a leading byte order mark itself.
const text = (bytes: Uint8Array | null) =>
  bytes ? new TextDecoder().decode(bytes) : null;

function json(bytes: Uint8Array | null): unknown {
  const source = text(bytes);
  if (source === null) return undefined;
  try {
    // Bedrock manifests often carry comments; strip whole-line ones.
    return JSON.parse(source.replace(/^\s*\/\/.*$/gm, ""));
  } catch {
    return undefined;
  }
}

/** Trimmed text, or undefined when there's none. */
const nonEmpty = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
};

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Reads a dropped file. Null when it isn't a format we understand. */
export async function readHints(source: Source): Promise<FileHints | null> {
  const ext = source.name.toLowerCase().split(".").pop() ?? "";
  try {
    if (["litematic", "schem", "schematic", "nbt"].includes(ext))
      return await readSchematic(source, ext);
    if (ext === "mcstructure") return await readMcstructure(source);
    const listing = await listZip(source.size, source.read, 5000);
    if (!listing) return null;
    const entries = new Map(
      listing.entries.map((entry) => [entry.name, entry]),
    );
    const archive = new Archive(entries, source.read);
    if (ext === "jar") return await readJar(archive);
    return await readPackOrWorld(archive, ext);
  } catch {
    // A damaged or unexpected file: no hints, the form stays as it is.
    return null;
  }
}

class Archive {
  constructor(
    readonly entries: Map<string, ArchiveEntry>,
    private readonly read: ReadRange,
  ) {}
  has(name: string) {
    return this.entries.has(name);
  }
  async bytes(name: string): Promise<Uint8Array | null> {
    const entry = this.entries.get(name);
    return entry ? readZipEntry(entry, this.read, 4 * 1024 * 1024) : null;
  }
  /** The first entry whose path ends in `/name` (or is `name`), shallowest first. */
  find(name: string, maxDepth = 2): string | undefined {
    let best: string | undefined;
    for (const path of this.entries.keys()) {
      const depth = path.split("/").length - 1;
      if (depth > maxDepth) continue;
      if (path !== name && !path.endsWith(`/${name}`)) continue;
      if (!best || depth < best.split("/").length - 1) best = path;
    }
    return best;
  }
}

// --- Mods and plugins ---------------------------------------------------------

const FABRIC_PLATFORM = new Set([
  "minecraft",
  "java",
  "fabricloader",
  "fabric-loader",
  "quilt_loader",
  "quilt_base",
]);

const KNOWN_NAMES: Readonly<Record<string, string>> = {
  "fabric-api": "Fabric API",
  fabric: "Fabric API",
  quilted_fabric_api: "Quilted Fabric API",
  qsl: "Quilt Standard Libraries",
  "cloth-config": "Cloth Config API",
  "cloth-config2": "Cloth Config API",
  modmenu: "Mod Menu",
  architectury: "Architectury API",
  geckolib: "GeckoLib",
  jei: "Just Enough Items",
  forgeconfigapiport: "Forge Config API Port",
};

function modrinthDependency(
  id: string,
  kind: DependencyHint["kind"],
): DependencyHint {
  const slug = id === "fabric" ? "fabric-api" : id;
  return {
    kind,
    id: slug,
    name: KNOWN_NAMES[id] ?? id,
    url: `https://modrinth.com/mod/${encodeURIComponent(slug)}`,
  };
}

async function readJar(archive: Archive): Promise<FileHints | null> {
  const fabric = json(await archive.bytes("fabric.mod.json"));
  if (fabric !== undefined) return fabricMod(record(fabric), "fabric");
  const quilt = json(await archive.bytes("quilt.mod.json"));
  if (quilt !== undefined) return quiltMod(record(quilt));
  for (const [path, loader] of [
    ["META-INF/neoforge.mods.toml", "neoforge"],
    ["META-INF/mods.toml", "forge"],
  ] as const) {
    const toml = text(await archive.bytes(path));
    if (toml !== null) return forgeMod(toml, loader);
  }
  const paper = text(await archive.bytes("paper-plugin.yml"));
  if (paper !== null) return bukkitPlugin(paper, ["paper"], "Paper plugin");
  const bukkit = text(await archive.bytes("plugin.yml"));
  if (bukkit !== null)
    return bukkitPlugin(bukkit, ["paper", "spigot", "bukkit"], "Bukkit plugin");
  const velocity = json(await archive.bytes("velocity-plugin.json"));
  if (velocity !== undefined) {
    const meta = record(velocity);
    return {
      label: "Velocity plugin",
      kind: "plugin",
      edition: "java",
      name: str(meta.name) ?? str(meta.id),
      version: str(meta.version),
      description: str(meta.description),
      loaders: ["velocity"],
      gameVersions: null,
      dependencies: [],
      notes: [],
    };
  }
  const bungee = text(await archive.bytes("bungee.yml"));
  if (bungee !== null) {
    const meta = yamlTop(bungee);
    return {
      label: "BungeeCord plugin",
      kind: "plugin",
      edition: "java",
      name: meta.name,
      version: meta.version,
      description: meta.description,
      loaders: ["bungeecord"],
      gameVersions: null,
      dependencies: [],
      notes: [],
    };
  }
  return null;
}

function fabricMod(meta: Record<string, unknown>, loader: string): FileHints {
  const depends = record(meta.depends);
  const minecraft = depends.minecraft;
  const rule =
    typeof minecraft === "string" ||
    (Array.isArray(minecraft) && minecraft.every((v) => typeof v === "string"))
      ? semverRule(minecraft)
      : null;
  const dependencies: DependencyHint[] = [];
  const add = (group: unknown, kind: DependencyHint["kind"]) => {
    for (const id of Object.keys(record(group))) {
      if (FABRIC_PLATFORM.has(id)) continue;
      dependencies.push(modrinthDependency(id, kind));
    }
  };
  add(meta.depends, "required");
  add(meta.recommends, "optional");
  add(meta.breaks, "incompatible");
  return {
    label: "Fabric mod",
    kind: "mod",
    edition: "java",
    name: str(meta.name) ?? str(meta.id),
    version: cleanModVersion(str(meta.version)),
    description: str(meta.description),
    loaders: [loader],
    gameVersions: rule,
    dependencies,
    notes: [],
  };
}

function quiltMod(meta: Record<string, unknown>): FileHints {
  const loader = record(meta.quilt_loader);
  const metadata = record(loader.metadata);
  const dependencies: DependencyHint[] = [];
  let rule: VersionRule | null = null;
  const depends = Array.isArray(loader.depends) ? loader.depends : [];
  for (const raw of depends) {
    const dep =
      typeof raw === "string" ? { id: raw } : (record(raw) as { id?: unknown });
    const id = str(dep.id);
    if (!id) continue;
    if (id === "minecraft") {
      const versions = (record(raw) as { versions?: unknown }).versions;
      if (typeof versions === "string" || Array.isArray(versions))
        rule = semverRule(versions as string | string[]);
      continue;
    }
    if (FABRIC_PLATFORM.has(id)) continue;
    dependencies.push(modrinthDependency(id, "required"));
  }
  return {
    label: "Quilt mod",
    kind: "mod",
    edition: "java",
    name: str(metadata.name) ?? str(loader.id),
    version: cleanModVersion(str(loader.version)),
    description: str(metadata.description),
    loaders: ["quilt"],
    gameVersions: rule,
    dependencies,
    notes: [],
  };
}

/** "${version}" placeholders (unfilled build templates) aren't versions. */
function cleanModVersion(version: string | undefined): string | undefined {
  return version && !version.includes("${") ? version : undefined;
}

/** Just enough TOML for mods.toml: [[mods]] and [[dependencies.<id>]] tables. */
function forgeMod(toml: string, loader: "forge" | "neoforge"): FileHints {
  const tables: { name: string; values: Record<string, string> }[] = [];
  let current: { name: string; values: Record<string, string> } = {
    name: "",
    values: {},
  };
  tables.push(current);
  for (const raw of toml.split(/\r?\n/)) {
    const lineText = raw.replace(/\s+#.*$/, "").trim();
    if (!lineText || lineText.startsWith("#")) continue;
    const header = /^\[\[?\s*([^\]]+?)\s*\]\]?$/.exec(lineText);
    if (header) {
      current = { name: header[1] ?? "", values: {} };
      tables.push(current);
      continue;
    }
    const pair = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/.exec(lineText);
    if (!pair) continue;
    const value = (pair[2] ?? "").trim();
    const quoted = /^(["'])(.*)\1$/.exec(value) ?? /^"""(.*)/.exec(value);
    current.values[pair[1] ?? ""] = quoted
      ? (quoted[2] ?? quoted[1] ?? "")
      : value;
  }
  const mod = tables.find((table) => table.name === "mods")?.values ?? {};
  const modId = mod.modId ?? "";
  let rule: VersionRule | null = null;
  const dependencies: DependencyHint[] = [];
  for (const table of tables) {
    if (!table.name.startsWith("dependencies")) continue;
    const id = table.values.modId;
    if (!id) continue;
    if (id === "minecraft") {
      rule = table.values.versionRange
        ? mavenRule(table.values.versionRange)
        : null;
      continue;
    }
    if (id === "forge" || id === "neoforge" || id === "java") continue;
    const type = (table.values.type ?? "").toLowerCase();
    const mandatory = table.values.mandatory;
    const kind: DependencyHint["kind"] =
      type === "incompatible"
        ? "incompatible"
        : type === "optional" || mandatory === "false"
          ? "optional"
          : "required";
    if (type === "discouraged") continue;
    dependencies.push(modrinthDependency(id, kind));
  }
  const version = mod.version;
  return {
    label: loader === "neoforge" ? "NeoForge mod" : "Forge mod",
    kind: "mod",
    edition: "java",
    name: mod.displayName ?? (modId || undefined),
    version: version && !version.includes("${") ? version : undefined,
    description: nonEmpty(mod.description),
    loaders: [loader],
    gameVersions: rule,
    dependencies,
    notes: [],
  };
}

/** Top-level `key: value` pairs of a YAML file (enough for plugin.yml). */
function yamlTop(source: string): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const raw of source.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*?)\s*$/.exec(raw);
    if (!match) continue;
    const value = (match[2] ?? "").replace(/\s+#.*$/, "");
    out[match[1] ?? ""] = value.replace(/^(["'])(.*)\1$/, "$2") || undefined;
  }
  return out;
}

/** A YAML list given inline ([a, b]) or as "- a" lines under the key. */
function yamlList(source: string, key: string): string[] {
  const inline = new RegExp(`^${key}:\\s*\\[(.*)\\]`, "m").exec(source);
  if (inline)
    return (inline[1] ?? "")
      .split(",")
      .map((item) => item.trim().replace(/^(["'])(.*)\1$/, "$2"))
      .filter(Boolean);
  const block = new RegExp(`^${key}:\\s*\\n((?:\\s+-.*\\n?)+)`, "m").exec(
    source,
  );
  if (!block) return [];
  return (block[1] ?? "")
    .split(/\n/)
    .map((item) =>
      item
        .replace(/^\s*-\s*/, "")
        .trim()
        .replace(/^(["'])(.*)\1$/, "$2"),
    )
    .filter(Boolean);
}

function bukkitPlugin(
  source: string,
  loaders: string[],
  label: string,
): FileHints {
  const meta = yamlTop(source);
  const api = meta["api-version"];
  const depends = yamlList(source, "depend");
  const soft = yamlList(source, "softdepend");
  const notes: string[] = [];
  if (depends.length) notes.push(`Needs ${depends.join(", ")}`);
  if (soft.length) notes.push(`Works with ${soft.join(", ")}`);
  return {
    label,
    kind: "plugin",
    edition: "java",
    name: meta.name,
    version:
      meta.version && !meta.version.includes("${") ? meta.version : undefined,
    description: meta.description,
    loaders,
    gameVersions: api ? atLeast(api) : null,
    dependencies: [],
    notes,
  };
}

// --- Packs and worlds ----------------------------------------------------------

async function readPackOrWorld(
  archive: Archive,
  ext: string,
): Promise<FileHints | null> {
  // Bedrock: manifest.json (packs, add-ons) or a world (.mcworld).
  const levelName = archive.find("levelname.txt", 1);
  const bedrockLevel = archive.find("level.dat", 1);
  if (
    ext === "mcworld" ||
    ext === "mctemplate" ||
    (levelName && bedrockLevel && archive.find("db/CURRENT", 2))
  ) {
    return bedrockWorld(archive, levelName, bedrockLevel);
  }
  const manifestPath = archive.find("manifest.json", 2);
  if (manifestPath) {
    const manifest = record(json(await archive.bytes(manifestPath)));
    if (manifest.format_version !== undefined && manifest.header !== undefined)
      return bedrockPack(manifest);
  }
  const mcmetaPath = archive.find("pack.mcmeta", 1);
  if (mcmetaPath) {
    const dir = mcmetaPath.slice(0, -"pack.mcmeta".length);
    const isData = [...archive.entries.keys()].some((path) =>
      path.startsWith(`${dir}data/`),
    );
    return javaPack(
      record(json(await archive.bytes(mcmetaPath))),
      isData ? "data_pack" : "resource_pack",
    );
  }
  const javaLevel = archive.find("level.dat", 1);
  if (javaLevel) return javaWorld(await archive.bytes(javaLevel));
  return null;
}

function javaPack(
  mcmeta: Record<string, unknown>,
  kind: "resource_pack" | "data_pack",
): FileHints {
  const pack = record(mcmeta.pack);
  const format =
    typeof pack.pack_format === "number" ? pack.pack_format : undefined;
  // supported_formats: n, [min, max] or { min_inclusive, max_inclusive }; newer
  // packs say min_format / max_format.
  let min = format;
  let max = format;
  const supported = pack.supported_formats;
  if (typeof supported === "number") [min, max] = [supported, supported];
  else if (Array.isArray(supported) && supported.length === 2)
    [min, max] = supported as [number, number];
  else if (typeof supported === "object" && supported !== null) {
    const range = record(supported);
    if (typeof range.min_inclusive === "number") min = range.min_inclusive;
    if (typeof range.max_inclusive === "number") max = range.max_inclusive;
  }
  const minFormat = pack.min_format;
  const maxFormat = pack.max_format;
  if (typeof minFormat === "number") min = minFormat;
  else if (Array.isArray(minFormat) && typeof minFormat[0] === "number")
    min = minFormat[0];
  if (typeof maxFormat === "number") max = maxFormat;
  else if (Array.isArray(maxFormat) && typeof maxFormat[0] === "number")
    max = maxFormat[0];

  const table =
    kind === "data_pack" ? DATA_PACK_FORMATS : RESOURCE_PACK_FORMATS;
  const description = pack.description;
  return {
    label: kind === "data_pack" ? "Data pack" : "Resource pack",
    kind,
    edition: "java",
    description:
      typeof description === "string"
        ? stripFormatting(description)
        : undefined,
    loaders: [],
    gameVersions:
      min !== undefined ? packFormatRule(table, min, max ?? min) : null,
    dependencies: [],
    notes:
      min !== undefined
        ? [
            `Pack format ${String(min)}${max !== undefined && max !== min ? `–${String(max)}` : ""}`,
          ]
        : [],
  };
}

/** "§6Gold §ltext" → "Gold text". */
function stripFormatting(value: string): string | undefined {
  const plain = value.replace(/§./g, "").trim();
  return plain || undefined;
}

function bedrockVersion(value: unknown): VersionRule | null {
  if (
    !Array.isArray(value) ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number"
  )
    return null;
  // Bedrock lines are listed as "1.21.x" (or "26.x" from 2026 on).
  const major = value[0];
  const minor = value[1];
  return {
    kind: "exact",
    versions: [
      major >= 26
        ? `${String(major)}.x`
        : `${String(major)}.${String(minor)}.x`,
    ],
  };
}

function bedrockPack(manifest: Record<string, unknown>): FileHints {
  const header = record(manifest.header);
  const modules = Array.isArray(manifest.modules) ? manifest.modules : [];
  const types = new Set(modules.map((module) => str(record(module).type)));
  const isData = types.has("data") || types.has("script");
  const version = Array.isArray(header.version)
    ? header.version.join(".")
    : str(header.version);
  return {
    label: isData ? "Bedrock behaviour pack" : "Bedrock resource pack",
    kind: isData ? "data_pack" : "resource_pack",
    edition: "bedrock",
    name: stripFormatting(str(header.name) ?? ""),
    version,
    description: stripFormatting(str(header.description) ?? ""),
    loaders: [],
    gameVersions: bedrockVersion(header.min_engine_version),
    dependencies: [],
    notes: [],
  };
}

async function javaWorld(bytes: Uint8Array | null): Promise<FileHints | null> {
  if (!bytes) return null;
  const { value } = readNbt(isGzip(bytes) ? await gunzip(bytes) : bytes);
  const name = getString(value, "Data", "LevelName");
  const versionName = getString(value, "Data", "Version", "Name");
  const dataVersion = getNumber(value, "Data", "DataVersion");
  const fromData =
    dataVersion !== undefined ? versionOfData(dataVersion) : null;
  const id = versionName ?? fromData;
  return {
    label: "Java world",
    kind: "world",
    edition: "java",
    name,
    loaders: [],
    gameVersions: id ? { kind: "exact", versions: [id] } : null,
    dependencies: [],
    notes: id ? [`Saved in ${id}`] : [],
  };
}

async function bedrockWorld(
  archive: Archive,
  levelName: string | undefined,
  level: string | undefined,
): Promise<FileHints> {
  const name = levelName
    ? text(await archive.bytes(levelName))?.trim()
    : undefined;
  let rule: VersionRule | null = null;
  const bytes = level ? await archive.bytes(level) : null;
  if (bytes && bytes.length > 8) {
    try {
      const { value } = readNbt(bytes.subarray(8), { little: true });
      const opened = get(value, "lastOpenedWithVersion");
      if (Array.isArray(opened)) rule = bedrockVersion(opened);
    } catch {
      // No version, then.
    }
  }
  return {
    label: "Bedrock world",
    kind: "world",
    edition: "bedrock",
    name: nonEmpty(name),
    loaders: [],
    gameVersions: rule,
    dependencies: [],
    notes: [],
  };
}

// --- Schematics ------------------------------------------------------------------

function size(x?: number, y?: number, z?: number): string | null {
  return x && y && z
    ? `${String(Math.abs(x))} × ${String(Math.abs(y))} × ${String(Math.abs(z))} blocks`
    : null;
}

const MAX_SCHEMATIC_BYTES = 64 * 1024 * 1024;

async function readSchematic(
  source: Source,
  ext: string,
): Promise<FileHints | null> {
  if (source.size > MAX_SCHEMATIC_BYTES) return null;
  const raw = await source.read(0, source.size);
  const { value } = readNbt(isGzip(raw) ? await gunzip(raw) : raw);
  const notes: string[] = [];
  let name: string | undefined;
  let description: string | undefined;
  let dataVersion: number | undefined;
  let label: string;

  if (ext === "litematic") {
    label = "Litematica schematic";
    name = getString(value, "Metadata", "Name");
    description = getString(value, "Metadata", "Description");
    const author = getString(value, "Metadata", "Author");
    dataVersion = getNumber(value, "MinecraftDataVersion");
    const dims = size(
      getNumber(value, "Metadata", "EnclosingSize", "x"),
      getNumber(value, "Metadata", "EnclosingSize", "y"),
      getNumber(value, "Metadata", "EnclosingSize", "z"),
    );
    if (dims) notes.push(dims);
    const blocks = getNumber(value, "Metadata", "TotalBlocks");
    if (blocks) notes.push(`${blocks.toLocaleString("en")} blocks placed`);
    if (author) notes.push(`By ${author}`);
  } else if (ext === "nbt") {
    label = "Structure";
    dataVersion = getNumber(value, "DataVersion");
    const dims = get(value, "size");
    if (Array.isArray(dims)) {
      const [x, y, z] = dims as number[];
      const text = size(x, y, z);
      if (text) notes.push(text);
    }
  } else {
    // Sponge .schem: v3 nests everything in "Schematic"; v1/v2 and old MCEdit
    // .schematic files keep it at the root.
    const root: NbtValue = get(value, "Schematic") ?? value;
    label = ext === "schem" ? "Sponge schematic" : "Schematic";
    dataVersion = getNumber(root, "DataVersion");
    name = getString(root, "Metadata", "Name");
    const author = getString(root, "Metadata", "Author");
    const dims = size(
      getNumber(root, "Width"),
      getNumber(root, "Height"),
      getNumber(root, "Length"),
    );
    if (dims) notes.push(dims);
    if (author) notes.push(`By ${author}`);
  }
  const id = dataVersion !== undefined ? versionOfData(dataVersion) : null;
  if (id) notes.push(`Made in ${id}`);
  return {
    label,
    kind: "build",
    edition: "java",
    name,
    description,
    loaders: [],
    // Builds paste into the version they were made in and later ones.
    gameVersions: id ? atLeast(id) : null,
    dependencies: [],
    notes,
  };
}

async function readMcstructure(source: Source): Promise<FileHints | null> {
  if (source.size > MAX_SCHEMATIC_BYTES) return null;
  const { value } = readNbt(await source.read(0, source.size), {
    little: true,
  });
  const dims = get(value, "size");
  const notes: string[] = [];
  if (Array.isArray(dims)) {
    const [x, y, z] = dims as number[];
    const text = size(x, y, z);
    if (text) notes.push(text);
  }
  return {
    label: "Bedrock structure",
    kind: "build",
    edition: "bedrock",
    loaders: [],
    gameVersions: null,
    dependencies: [],
    notes,
  };
}
