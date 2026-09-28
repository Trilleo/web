import { pingDatabase } from "@trilleo/db";
import type { APIRoute } from "astro";
import { getDb } from "../../lib/db";

// Runs on the server for every request. Docker's health check calls it (so the first
// check also applies any pending migrations); Caddy doesn't expose it publicly.
export const prerender = false;

const headers = { "Cache-Control": "no-store" };

export const GET: APIRoute = async () => {
  try {
    await pingDatabase(await getDb());
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json({ status: "error" }, { status: 503, headers });
  }
};
