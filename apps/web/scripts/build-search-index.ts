/**
 * Builds the Pagefind search index for published post pages (/writing/<slug>/).
 * Usage: node scripts/build-search-index.ts <static-files-dir> (e.g. dist/client)
 *
 * Skips cleanly when there are no post pages yet: Pagefind itself fails on an empty
 * index, which would otherwise break every build until the first post is published.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as pagefind from "pagefind";

const POST_PAGES = "writing/*/index.html";

const site = process.argv[2] ?? "dist/client";
const writing = join(site, "writing");
const postCount = existsSync(writing)
  ? readdirSync(writing, { withFileTypes: true }).filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(writing, entry.name, "index.html")) &&
        entry.name !== "tags",
    ).length
  : 0;

if (postCount === 0) {
  console.log("Search index: no post pages yet, skipping.");
  process.exit(0);
}

const fail = (step: string, errors: string[]): never => {
  console.error(`Search index: ${step} failed:\n${errors.join("\n")}`);
  process.exit(1);
};

const { index, errors } = await pagefind.createIndex();
if (!index) fail("createIndex", errors);
else {
  const added = await index.addDirectory({ path: site, glob: POST_PAGES });
  if (added.errors.length > 0) fail("addDirectory", added.errors);
  const written = await index.writeFiles({
    outputPath: join(site, "pagefind"),
  });
  if (written.errors.length > 0) fail("writeFiles", written.errors);
  console.log(`Search index: ${String(added.page_count)} post pages indexed.`);
}
await pagefind.close();
