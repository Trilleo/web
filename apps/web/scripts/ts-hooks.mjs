/**
 * Lets plain Node (24, which strips TypeScript types itself) run the app's own
 * modules outside Vite, for scripts like chunithm-bundle.ts:
 *
 * - relative imports without an extension ("./png") find their .ts file, as Vite's do;
 * - `?inline` imports (the WebP encoder's wasm) become a base64 data URL, as Vite
 *   inlines them;
 * - `import.meta.env` is there (empty), as in a Vite build with no PUBLIC_ settings.
 *
 * Parameter properties (`constructor(readonly x)`) need type transforms, not just
 * stripping. Usage:
 * node --experimental-transform-types --import ./scripts/ts-hooks.mjs scripts/<script>.ts
 */
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const INLINE = "?inline";
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.endsWith(INLINE)) {
      const resolved = nextResolve(specifier.slice(0, -INLINE.length), context);
      return {
        url: resolved.url + INLINE,
        format: "module",
        shortCircuit: true,
      };
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const relative =
        specifier.startsWith("./") || specifier.startsWith("../");
      if (!relative || /\.[cm]?[jt]sx?$/.test(specifier)) throw error;
      for (const extension of EXTENSIONS) {
        try {
          return nextResolve(specifier + extension, context);
        } catch {
          // Try the next one.
        }
      }
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(INLINE)) {
      const loaded = nextLoad(url, context);
      if (!url.endsWith(".ts") || url.includes("/node_modules/")) return loaded;
      const source = String(loaded.source);
      if (!source.includes("import.meta.env")) return loaded;
      return { ...loaded, source: `import.meta.env ??= {};\n${source}` };
    }
    const file = fileURLToPath(url.slice(0, -INLINE.length));
    const type = file.endsWith(".wasm")
      ? "application/wasm"
      : "application/octet-stream";
    const data = `data:${type};base64,${readFileSync(file).toString("base64")}`;
    return {
      format: "module",
      source: `export default ${JSON.stringify(data)};`,
      shortCircuit: true,
    };
  },
});
