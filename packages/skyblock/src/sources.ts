/**
 * Reading SkyShards' data files (github.com/Campionnn/SkyShards, MIT) into a Dataset:
 *
 * - public/fusion-data.json: `shards` (name, rarity, skill type, fuse amount, Hypixel's
 *   ID) and `recipes` (output key → quantity → input pairs);
 * - public/fusion-properties.json: category, families, the special fusion's input
 *   rules, ID and chameleon results and origins;
 * - src/desc.json: each shard's attribute (title, text, how to hunt);
 * - public/rates.json: default shards per hour.
 *
 * Everything is checked; problems are collected and thrown together as a DataError,
 * so the site never keeps a half-read version. Missing descriptions or rates aren't
 * problems (a new shard may not have them yet).
 */
import { compareShardIds, parseRarity } from "./rarity";
import {
  shardSlug,
  type Dataset,
  type RecipeRow,
  type ShardRecord,
} from "./dataset";
import { parseSegments, type Segment } from "./text";

export interface SourceFiles {
  fusionData: unknown;
  properties: unknown;
  descriptions: unknown;
  rates: unknown;
}

export interface ReadOptions {
  /** Fewer shards than this is refused (a truncated or emptied file). */
  minShards?: number;
}

/** Below this many shards a file is taken to be broken (the game has over 300). */
export const MIN_SHARDS = 100;

export class DataError extends Error {
  constructor(readonly problems: string[]) {
    super(
      `The shard data doesn't read: ${problems.slice(0, 5).join("; ")}${problems.length > 5 ? ` (and ${String(problems.length - 5)} more)` : ""}`,
    );
    this.name = "DataError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const KEY = /^[A-Z]\d{1,4}$/;
const INTERNAL_ID = /^SHARD_[A-Z0-9_]+$/;

const text = (value: unknown, max = 200): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const names = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        const name = text(item);
        return name ? [name] : [];
      })
    : [];

export function readSources(
  files: SourceFiles,
  options: ReadOptions = {},
): Dataset {
  const problems: string[] = [];
  const { fusionData, properties, descriptions, rates } = files;
  if (!isRecord(fusionData) || !isRecord(fusionData.shards))
    throw new DataError(["fusion-data.json has no shards"]);
  if (!isRecord(fusionData.recipes))
    throw new DataError(["fusion-data.json has no recipes"]);
  if (!isRecord(properties))
    throw new DataError(["fusion-properties.json isn't an object"]);
  const descs = isRecord(descriptions) ? descriptions : {};
  const rateTable = isRecord(rates) ? rates : {};

  const shards: ShardRecord[] = [];
  const slugs = new Map<string, string>();
  const ids = new Set<string>();
  for (const [key, raw] of Object.entries(fusionData.shards)) {
    const where = `shard ${key}`;
    if (!KEY.test(key) || !isRecord(raw)) {
      problems.push(`${where}: not a shard`);
      continue;
    }
    const name = text(raw.name, 80);
    const rarity = parseRarity(raw.rarity);
    const id = text(raw.internal_id, 80);
    const fuseAmount = raw.fuse_amount;
    const props = properties[key];
    if (!name) problems.push(`${where}: no name`);
    if (!rarity)
      problems.push(`${where}: rarity ${JSON.stringify(raw.rarity)}`);
    if (!INTERNAL_ID.test(id))
      problems.push(`${where}: Hypixel ID ${JSON.stringify(raw.internal_id)}`);
    if (
      typeof fuseAmount !== "number" ||
      !Number.isInteger(fuseAmount) ||
      fuseAmount < 1 ||
      fuseAmount > 64
    )
      problems.push(`${where}: fuse amount ${JSON.stringify(fuseAmount)}`);
    if (!isRecord(props))
      problems.push(`${where}: missing from fusion-properties.json`);
    const slug = shardSlug(name);
    if (name && !slug) problems.push(`${where}: "${name}" makes no address`);
    const clash = slugs.get(slug);
    if (slug && clash)
      problems.push(`${where}: "${name}" has the same address as ${clash}`);
    if (ids.has(id)) problems.push(`${where}: ${id} twice`);
    if (
      !name ||
      !rarity ||
      !slug ||
      clash ||
      !isRecord(props) ||
      typeof fuseAmount !== "number"
    )
      continue;
    slugs.set(slug, key);
    ids.add(id);
    const input1 = text(props.input1);
    const input2 = text(props.input2);
    const rate = rateTable[key];
    const desc = descs[key];
    let attribute: ShardRecord["attribute"] = null;
    if (isRecord(desc) && text(desc.title)) {
      attribute = {
        title: text(desc.title, 80),
        id: text(desc.id, 80),
        description: parseSegments(desc.description),
        howToHunt: Array.isArray(desc.how_to_hunt)
          ? desc.how_to_hunt
              .map((line): Segment[] => parseSegments(line))
              .filter((line) => line.length > 0)
          : [],
      };
    }
    shards.push({
      key,
      id,
      slug,
      name,
      rarity,
      category: text(props.category, 40),
      families: names(props.family),
      skill: text(raw.type, 40),
      fuseAmount,
      synthesized: raw.synthesized === true,
      chameleon: raw.chameleon === true,
      inputs: input1 && input2 ? [input1, input2] : null,
      idResult: text(props.id_result) || null,
      chameleonResult: names(props.chameleon_result),
      idOrigin: names(props.id_origin),
      chameleonOrigin: names(props.chameleon_origin),
      rate:
        typeof rate === "number" && Number.isFinite(rate) && rate >= 0
          ? rate
          : 0,
      attribute,
    });
  }
  const minShards = options.minShards ?? MIN_SHARDS;
  if (shards.length < minShards)
    problems.push(
      `only ${String(shards.length)} shards (at least ${String(minShards)} expected)`,
    );

  // Stable order: Hypixel's, by rarity letter, then number (C1, C2, … U1, …).
  shards.sort((a, b) => compareShardIds(a.key, b.key));
  const index = new Map(shards.map((shard, i) => [shard.key, i]));

  const recipes: RecipeRow[] = [];
  let unknown = 0;
  for (const [output, byQuantity] of Object.entries(fusionData.recipes)) {
    const out = index.get(output);
    if (out === undefined || !isRecord(byQuantity)) {
      unknown++;
      continue;
    }
    for (const [quantityText, pairs] of Object.entries(byQuantity)) {
      const quantity = Number(quantityText);
      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 64 ||
        !Array.isArray(pairs)
      ) {
        problems.push(`recipes for ${output}: quantity ${quantityText}`);
        continue;
      }
      const row: RecipeRow = [out, quantity];
      for (const pair of pairs) {
        if (!Array.isArray(pair) || pair.length !== 2) {
          unknown++;
          continue;
        }
        const a = index.get(String(pair[0]));
        const b = index.get(String(pair[1]));
        if (a === undefined || b === undefined) {
          unknown++;
          continue;
        }
        row.push(a, b);
      }
      if (row.length > 2) recipes.push(row);
    }
  }
  if (recipes.length === 0) problems.push("no recipes");
  // A few stray entries are tolerated; many mean the files don't belong together.
  if (unknown > 50)
    problems.push(`${String(unknown)} recipes name unknown shards`);
  recipes.sort(
    // By output, then fewest made first: the order SkyShards (and so the solver,
    // which keeps the first of equally cheap recipes) sees them in.
    (a, b) => (a[0] ?? 0) - (b[0] ?? 0) || (a[1] ?? 0) - (b[1] ?? 0),
  );

  if (problems.length > 0) throw new DataError(problems);
  return { shards, recipes };
}
