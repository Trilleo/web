/**
 * Reading the four data files at one commit (shared by the sync and the snapshot
 * script; free of the database).
 */
import type { SourceFiles } from "@trilleo/skyblock";
import {
  DATA_FILES,
  SourceError,
  type DataFile,
  type SkyblockSource,
} from "./source";

/** The data files' git blob SHAs at a commit, by path; throws if one is missing. */
export function dataFileShas(
  source: SkyblockSource,
  commit: string,
  tree: Map<string, string>,
): Record<string, string> {
  const files: Record<string, string> = {};
  for (const path of Object.values(DATA_FILES)) {
    const sha = tree.get(path);
    if (!sha)
      throw new SourceError(
        `${source.repo}@${commit.slice(0, 7)}`,
        `${path} isn't there`,
      );
    files[path] = sha;
  }
  return files;
}

export async function readDataFiles(
  source: SkyblockSource,
  commit: string,
  tree: Map<string, string>,
  fetchFile: (path: string) => Promise<unknown>,
): Promise<{ files: Record<string, string>; data: SourceFiles }> {
  const files = dataFileShas(source, commit, tree);
  const data: Partial<Record<DataFile, unknown>> = {};
  // One at a time: GitHub is slow from the mainland, and this is a few MB at most.
  for (const [name, path] of Object.entries(DATA_FILES) as [DataFile, string][])
    data[name] = await fetchFile(path);
  return {
    files,
    data: {
      fusionData: data.fusionData,
      properties: data.properties,
      descriptions: data.descriptions,
      rates: data.rates,
    },
  };
}
