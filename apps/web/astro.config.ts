import { existsSync } from "node:fs";
import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";
import { SITE_URL, isPrivatePath } from "./src/lib/site";

/**
 * The app image has no node_modules (every new layer is a slow upload to SWR in
 * China), so the production server must be one self-contained bundle. Vite leaves
 * this package's own dependencies (react, drizzle-orm, …) as runtime imports unless
 * told otherwise. Build-only: the dev server keeps Vite's usual handling.
 * scripts/check-server-bundle.ts proves the result runs on its own.
 */
const bundleServerDependencies: AstroIntegration = {
  name: "trilleo:bundle-server-dependencies",
  hooks: {
    "astro:config:setup": ({ command, updateConfig }) => {
      if (command === "build")
        updateConfig({ vite: { ssr: { noExternal: true } } });
    },
  },
};

// Local secrets for `pnpm dev` (apps/web/.env, gitignored; see .env.example). Server
// code reads process.env, which Vite doesn't fill. Variables already set win, and
// production has no .env: its settings come from the container's environment.
if (existsSync(".env")) process.loadEnvFile(".env");

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  security: {
    // Hosts the server believes in requests (Host, and X-Forwarded-* from Caddy), so
    // URLs, cookies and the same-origin check on form posts see the real address.
    // Anything else shows up as "localhost". Caddy only ever forwards www.trilleo.net.
    allowedDomains: [
      { hostname: "www.trilleo.net", protocol: "https" },
      { hostname: "localhost", protocol: "http" },
      { hostname: "127.0.0.1", protocol: "http" },
    ],
  },
  // The e2e build (which includes drafts) writes elsewhere so it never mixes with dist/.
  outDir: process.env.ASTRO_OUT_DIR ?? "./dist",
  // Pages are still pre-built by default. Routes that opt out (`prerender = false`) run
  // on the Node server: dist/client holds the static files, dist/server the server.
  adapter: node({ mode: "standalone" }),
  integrations: [
    react(),
    // The sitemap would also list server pages such as /admin/; leave those out.
    sitemap({ filter: (page) => !isPrivatePath(new URL(page).pathname) }),
    bundleServerDependencies,
  ],
  markdown: {
    shikiConfig: { theme: "vesper" },
  },
  vite: {
    plugins: [tailwindcss()],
    // Lets `?inline` embed WebAssembly as a data URL: resvg's, for share images
    // (src/lib/og/render.ts), so the server bundle doesn't need the file beside it.
    assetsInclude: ["**/*.wasm"],
    ssr: {
      // The one exception to bundling (this list wins over `noExternal: true`):
      // PGlite loads its WebAssembly files from next to its own code. Only dev and
      // the e2e build use it (a devDependency here); production never imports it.
      external: ["@electric-sql/pglite"],
    },
  },
});
