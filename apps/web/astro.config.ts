import mdx from "@astrojs/mdx";
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
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    shikiConfig: { theme: "vesper" },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
