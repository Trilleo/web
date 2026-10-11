/**
 * Wiki components: the registry (what exists, in which sets), the markdown-it plugin
 * that renders them, and helpers for reading what's typed inside them. Server-side
 * and pure; the browser part (tabs) is `./client`.
 */
export * from "./types";
export * from "./registry";
export {
  BARE_HOST,
  componentPlugin,
  componentSource,
  errorBox,
  type ComponentEnv,
  type ComponentHost,
  type ComponentState,
} from "./plugin";
export * from "./minecraft/text";
export * from "./minecraft/items";
export {
  escapeHtml,
  firstWord,
  parseField,
  parseSectionLine,
  plainSource,
  splitSections,
} from "./syntax";
