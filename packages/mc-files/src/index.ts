/**
 * @trilleo/mc-files: reading Minecraft's own files in the browser (and in tests).
 *   nbt       the NBT format (Java and Bedrock)
 *   versions  version ranges, pack formats and data versions → Minecraft versions
 *   metadata  what a mod, plugin, pack, world or schematic says about itself
 *   voxels    the blocks in a build (.litematic, .schem, .nbt, .mcstructure)
 *   preview   a build's compact form for the 3D view
 *   blocks    how blocks look there (colours, shapes)
 *   mesh      a build as triangles
 */
export * from "./metadata";
export * from "./nbt";
export * from "./versions";
export * from "./blocks";
export * from "./mesh";
export * from "./preview";
export * from "./voxels";
