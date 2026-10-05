import type { APIRoute } from "astro";
import { securityTxt } from "../../lib/security-txt";

export const GET: APIRoute = () =>
  new Response(securityTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
