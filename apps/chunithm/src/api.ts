/**
 * Talking to the site: the catalog index (/api/chunithm/index.json) and a chart's
 * picture (/api/chunithm/charts/<id>/<difficulty>), which may still be building.
 */
import type { ChartManifest, Difficulty, SongIndex } from "@trilleo/chunithm";

export type Variant = "normal" | "mirror";

/** What the picture route answers (lib/chunithm/build.ts's BuildState, as JSON). */
export type PictureState =
  | { status: "ready"; manifest: ChartManifest; builtAt: string }
  | { status: "queued" | "building" }
  | { status: "failed"; error: string; retryAt: string | null }
  | {
      status: "unavailable";
      reason:
        "no-chart" | "no-page" | "withdrawn" | "storage" | "busy" | "too-many";
    };

/** Words for an unavailable picture. */
export const UNAVAILABLE: Record<
  Extract<PictureState, { status: "unavailable" }>["reason"],
  string
> = {
  "no-chart": "There's no such chart.",
  "no-page": "sdvx.in hasn't drawn this chart yet.",
  withdrawn: "This chart has been taken down.",
  storage: "Chart pictures aren't available here right now.",
  busy: "Lots of charts are being drawn right now. Try again in a minute.",
  "too-many": "You've opened many new charts this hour. Try again later.",
};

export function pictureUrl(
  songId: number,
  difficulty: Difficulty,
  variant: Variant,
): string {
  return `/api/chunithm/charts/${String(songId)}/${difficulty}${variant === "mirror" ? "?variant=mirror" : ""}`;
}

export async function fetchPicture(
  songId: number,
  difficulty: Difficulty,
  variant: Variant,
  signal?: AbortSignal,
): Promise<PictureState> {
  const response = await fetch(pictureUrl(songId, difficulty, variant), {
    signal,
    headers: { Accept: "application/json" },
  });
  const body = (await response.json()) as PictureState;
  return body;
}

export async function fetchIndex(signal?: AbortSignal): Promise<SongIndex> {
  // Always checked with the server (by its ETag: unchanged costs a 304), so a name
  // or chart added a moment ago is found at once.
  const response = await fetch("/api/chunithm/index.json", {
    signal,
    cache: "no-cache",
  });
  if (!response.ok)
    throw new Error(`The catalog didn't load (${String(response.status)}).`);
  return (await response.json()) as SongIndex;
}

/** A chart page's address. */
export function chartHref(songId: number, difficulty: Difficulty): string {
  return `/tools/chunithm/${String(songId)}/${difficulty}/`;
}
