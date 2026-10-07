/**
 * @trilleo/mc-files: reading Minecraft's own files in the browser (and in tests).
 *   nbt       the NBT format (Java and Bedrock)
 *   versions  version ranges, pack formats and data versions → Minecraft versions
 *   metadata  what a mod, plugin, pack, world or schematic says about itself
 */
export * from "./metadata";
export * from "./nbt";
export * from "./versions";
