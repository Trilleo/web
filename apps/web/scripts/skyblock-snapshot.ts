/**
 * Refreshes the Hypixel SkyBlock shard data committed with the site: the copy a new
 * database starts from (and dev and e2e use, which never fetch), and the shard icons
 * served as files. The server keeps itself current without this (lib/skyblock/
 * sync.ts); run it now and then so a fresh install doesn't start far behind.
 *
 *   pnpm --filter @trilleo/web skyblock:snapshot
 *
 * Writes src/lib/skyblock/snapshot.json, src/lib/skyblock/static-icons.json and
 * public/tools/skyblock/shard-icons/*.webp from SkyShards' newest commit. Icons whose
 * PNG hasn't changed are kept as they are. SKYBLOCK_REPO, SKYBLOCK_GITHUB_API and
 * SKYBLOCK_RAW_URL point elsewhere.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pairCount, readSources } from "@trilleo/skyblock";
import {
  ICON_DIR,
  SOURCE_LIMITS,
  fetchBytes,
  fetchJson,
  fileTree,
  latestCommit,
  rawFileUrl,
  skyblockSource,
} from "../src/lib/skyblock/source";
import { readDataFiles } from "../src/lib/skyblock/read";
import {
  iconFileName,
  iconWebp,
  type StaticIcons,
} from "../src/lib/skyblock/icon-files";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(root, "src/lib/skyblock/snapshot.json");
const iconsPath = join(root, "src/lib/skyblock/static-icons.json");
const iconDir = join(root, "public/tools/skyblock/shard-icons");

const source = skyblockSource({ ...process.env, SKYBLOCK_SYNC: undefined });
if (!source) throw new Error("unreachable: the snapshot always fetches");

const commit = await latestCommit(fetch, source);
const tree = await fileTree(fetch, source, commit);
console.log(`SkyShards ${commit.slice(0, 7)}: reading the data files…`);
const { files, data } = await readDataFiles(source, commit, tree, (path) =>
  fetchJson(fetch, rawFileUrl(source, commit, path)),
);
const dataset = readSources(data);
writeFileSync(
  snapshotPath,
  `${JSON.stringify({ commit, files, data: dataset })}\n`,
);
console.log(
  `${String(dataset.shards.length)} shards, ${String(pairCount(dataset))} pairs.`,
);

const before: StaticIcons = existsSync(iconsPath)
  ? (JSON.parse(readFileSync(iconsPath, "utf8")) as StaticIcons)
  : {};
const icons: StaticIcons = {};
mkdirSync(iconDir, { recursive: true });
let copied = 0;
for (const shard of dataset.shards) {
  const sha = tree.get(`${ICON_DIR}${shard.key}.png`);
  if (!sha) {
    console.warn(`No icon for ${shard.name} (${shard.key}).`);
    continue;
  }
  const file = iconFileName(shard.id);
  const kept = before[shard.id];
  if (
    kept?.sha === sha &&
    kept.file === file &&
    existsSync(join(iconDir, file))
  ) {
    icons[shard.id] = kept;
    continue;
  }
  const png = await fetchBytes(
    fetch,
    rawFileUrl(source, commit, `${ICON_DIR}${shard.key}.png`),
    SOURCE_LIMITS.maxIconBytes,
  );
  writeFileSync(join(iconDir, file), await iconWebp(png));
  icons[shard.id] = { file, sha };
  copied++;
}
// Icons of shards that have left the game go too.
for (const [id, icon] of Object.entries(before))
  if (!(id in icons)) rmSync(join(iconDir, icon.file), { force: true });
const sorted = Object.fromEntries(
  Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(iconsPath, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `${String(copied)} icons written, ${String(Object.keys(icons).length)} in all.`,
);
