import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { SITE_URL } from "./src/lib/site";

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  // The e2e build (which includes drafts) writes elsewhere so it never mixes with dist/.
  outDir: process.env.ASTRO_OUT_DIR ?? "./dist",
  // Pages are still pre-built by default. Routes that opt out (`prerender = false`) run
  // on the Node server: dist/client holds the static files, dist/server the server.
  adapter: node({ mode: "standalone" }),
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: "vesper" },
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // The server build bundles its dependencies, but PGlite loads its WebAssembly
      // files from next to its own code. Only dev and the e2e build use it (a
      // devDependency here); production talks to Postgres and never imports it.
      external: ["@electric-sql/pglite"],
    },
  },
});
