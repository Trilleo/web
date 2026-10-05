import type { APIRoute } from "astro";
import { CONTACT_EMAIL, GITHUB_URL, SITE_NAME, SITE_URL } from "../lib/site";

/** https://humanstxt.org: who made the site, in plain text. */
export const GET: APIRoute = () =>
  new Response(
    [
      "/* TEAM */",
      "Maker: Trilleo",
      `Contact: ${CONTACT_EMAIL}`,
      `GitHub: ${GITHUB_URL}`,
      "From: China",
      "",
      "/* SITE */",
      `Name: ${SITE_NAME}`,
      `URL: ${SITE_URL}`,
      "Language: English",
      "Standards: HTML, CSS, TypeScript, WCAG 2.2",
      "Components: Astro, React, Tailwind CSS, Drizzle, PostgreSQL",
      "Typefaces: Schibsted Grotesk, Source Serif 4, Geist Mono",
      `Colophon: ${new URL("/colophon/", SITE_URL).href}`,
      "",
    ].join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
