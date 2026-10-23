/**
 * The Astro integration that ships pdf.js's data files (pdf-assets.ts) with the site:
 * copied into the build's static files, and served from node_modules by `pnpm dev`.
 * Node-only: apps/web's astro.config imports it (`@trilleo/tool-preview/integration`).
 */
import {
  cpSync,
  createReadStream,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { PDF_ASSET_DIRS, PDF_ASSET_ROOT } from "./pdf-assets";

/** The files pdf.js needs to run nothing: its PDF-scripting engine stays out. */
const SKIP = "quickjs";

function pdfjsRoot(): { root: string; version: string } {
  const manifest = createRequire(import.meta.url).resolve(
    "pdfjs-dist/package.json",
  );
  const { version } = JSON.parse(readFileSync(manifest, "utf8")) as {
    version: string;
  };
  return { root: dirname(manifest), version };
}

const TYPES: Readonly<Record<string, string>> = {
  ".wasm": "application/wasm",
  ".js": "text/javascript",
};

export function pdfjsAssets(): AstroIntegration {
  const { root, version } = pdfjsRoot();
  const prefix = `${PDF_ASSET_ROOT}${version}/`;
  return {
    name: "trilleo:pdfjs-assets",
    hooks: {
      "astro:server:setup": ({ server }) => {
        server.middlewares.use((request, response, next) => {
          const path = (request.url ?? "").split("?")[0] ?? "";
          if (!path.startsWith(prefix)) {
            next();
            return;
          }
          const rest = normalize(decodeURIComponent(path.slice(prefix.length)));
          const [dir] = rest.split(sep);
          const file = join(root, rest);
          if (
            !PDF_ASSET_DIRS.includes(dir as (typeof PDF_ASSET_DIRS)[number]) ||
            rest.includes("..") ||
            rest.includes(SKIP) ||
            !existsSync(file) ||
            !statSync(file).isFile()
          ) {
            next();
            return;
          }
          const ext = file.slice(file.lastIndexOf("."));
          response.setHeader(
            "Content-Type",
            TYPES[ext] ?? "application/octet-stream",
          );
          createReadStream(file).pipe(response);
        });
      },
      "astro:build:done": ({ dir }) => {
        const out = join(fileURLToPath(dir), PDF_ASSET_ROOT, version);
        for (const each of PDF_ASSET_DIRS)
          cpSync(join(root, each), join(out, each), {
            recursive: true,
            filter: (source) => !source.includes(SKIP),
          });
      },
    },
  };
}
