import type { APIRoute } from "astro";
import { isDifficulty } from "@trilleo/chunithm";
import { findChart } from "../../../../../lib/chunithm/admin";
import {
  kickBuilds,
  requestBuild,
  siteBuildDeps,
  type Variant,
} from "../../../../../lib/chunithm/build";
import { parseId } from "../../../../../lib/comments/form";
import { getDb } from "../../../../../lib/db";

export const prerender = false;

/**
 * GET /api/chunithm/charts/<SEGA song ID>/<difficulty>[?variant=mirror]: a chart's
 * picture for the viewer. `ready` with its manifest (tiles bottom first, measures),
 * `queued` or `building` (ask again in a few seconds: asking started the build),
 * `failed` with why and when it's tried again, or `unavailable` with a reason.
 * Public: chart pictures are for everyone; builds are limited per visitor.
 */
export const GET: APIRoute = async (context) => {
  const { params, url } = context;
  const songId = parseId(params.song ?? "");
  const difficulty = params.difficulty ?? "";
  const variant: Variant =
    url.searchParams.get("variant") === "mirror" ? "mirror" : "normal";
  const noStore = { "Cache-Control": "no-store" };
  if (songId === null || !isDifficulty(difficulty))
    return Response.json(
      { status: "unavailable", reason: "no-chart" },
      { status: 404, headers: noStore },
    );
  const deps = await siteBuildDeps();
  if (!deps)
    return Response.json(
      { status: "unavailable", reason: "storage" },
      { status: 503, headers: noStore },
    );
  const chart = await findChart(await getDb(), songId, difficulty);
  if (!chart)
    return Response.json(
      { status: "unavailable", reason: "no-chart" },
      { status: 404, headers: noStore },
    );
  let ip = "";
  try {
    ip = context.clientAddress;
  } catch {
    // Not available (some test setups): everyone shares one limit.
  }
  const state = await requestBuild(deps, chart.id, variant, ip);
  // A new build, or a rebuild behind a ready picture: start the worker.
  if (state.status !== "unavailable" && state.status !== "failed") kickBuilds();
  if (state.status === "queued" || state.status === "building") {
    return Response.json(
      { ...state, retryAfter: 5 },
      { status: 202, headers: { ...noStore, "Retry-After": "5" } },
    );
  }
  if (state.status === "ready")
    return Response.json(state, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  return Response.json(state, { headers: noStore });
};
