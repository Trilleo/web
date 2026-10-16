import { describe, expect, it } from "vitest";
import {
  knownMaterials,
  materialIconHtml,
  materialKey,
  materialSprite,
  spriteSvg,
} from "./icons";

/** Every material TownyMenu's menus use (its wiki shows them all). */
const TOWNYMENU_MATERIALS =
  `NAME_TAG PLAYER_HEAD GRASS_BLOCK BELL BARRIER PAPER OAK_DOOR GOLD_NUGGET EMERALD
BEACON IRON_BARS COMPASS OAK_SIGN LEVER CLOCK WRITABLE_BOOK TNT RED_BANNER IRON_SWORD SHIELD HOPPER GOLDEN_HELMET
TRIPWIRE_HOOK SPYGLASS IRON_DOOR FLINT_AND_STEEL ENDER_PEARL ENDER_EYE GOLD_INGOT FILLED_MAP CHEST ZOMBIE_HEAD
LIME_DYE IRON_CHAIN GREEN_BANNER GOLD_BLOCK EXPERIENCE_BOTTLE COARSE_DIRT STRUCTURE_VOID REDSTONE OAK_SAPLING MAP
KNOWLEDGE_BOOK IRON_BOOTS BOOK WRITTEN_BOOK WHITE_BANNER RESPAWN_ANCHOR LAVA_BUCKET ARROW RED_BED RECOVERY_COMPASS
POPPY LECTERN IRON_PICKAXE IRON_NUGGET GRAY_DYE GLOWSTONE_DUST COMPARATOR COMMAND_BLOCK BOOKSHELF WOODEN_SHOVEL
WATER_BUCKET OAK_HANGING_SIGN OAK_BOAT MOSS_BLOCK MOSSY_STONE_BRICKS LIME_CONCRETE LIGHT_BLUE_DYE LEATHER_BOOTS
GOAT_HORN ENDER_CHEST EMERALD_BLOCK DIAMOND_SWORD CREEPER_HEAD CRACKED_STONE_BRICKS BRICKS BARREL ANVIL
YELLOW_STAINED_GLASS_PANE WOODEN_SWORD WITHER_ROSE WHITE_STAINED_GLASS_PANE WHITE_BED TNT_MINECART STICK
SPECTRAL_ARROW SNOWBALL SKELETON_SKULL REPEATER RED_STAINED_GLASS_PANE RED_CONCRETE REDSTONE_TORCH PAINTING
ORANGE_STAINED_GLASS_PANE NETHER_STAR NETHERRACK MOSSY_COBBLESTONE MILK_BUCKET LODESTONE LIME_STAINED_GLASS_PANE
LIGHT_BLUE_STAINED_GLASS_PANE GUNPOWDER GOLDEN_SHOVEL GLOWSTONE FIRE_CHARGE END_STONE END_CRYSTAL DIRT DIAMOND
DEAD_BUSH BRUSH BONE_MEAL BONE BLUE_STAINED_GLASS_PANE BLACK_STAINED_GLASS_PANE ARMOR_STAND`.split(
    /\s+/,
  );

describe("material icons", () => {
  it("cover every material TownyMenu uses", () => {
    const missing = TOWNYMENU_MATERIALS.filter(
      (name) => materialSprite(name) === null,
    );
    expect(missing).toEqual([]);
  });

  it("are at most 16×16, with even rows and every colour in the palette", () => {
    for (const name of knownMaterials()) {
      const sprite = materialSprite(name);
      if (!sprite) throw new Error(`${name} has no sprite`);
      expect(sprite.rows.length, name).toBeLessThanOrEqual(16);
      const width = sprite.rows[0]?.length ?? 0;
      expect(width, name).toBeLessThanOrEqual(16);
      for (const row of sprite.rows) {
        expect(row.length, `${name}: ${row}`).toBe(width);
        for (const char of row)
          if (char !== ".")
            expect(sprite.palette[char], `${name} uses ${char}`).toMatch(
              /^#[0-9a-f]{6}$/,
            );
      }
    }
  });

  it("read names the way people write them", () => {
    expect(materialKey(" minecraft:Lime Stained-Glass Pane ")).toBe(
      "lime_stained_glass_pane",
    );
    expect(materialSprite("Golden Helmet")).not.toBeNull();
  });

  it("draw runs of pixels as one path per colour", () => {
    const svg = spriteSvg({
      rows: ["aab", "a.b"],
      palette: { a: "#111111", b: "#222222" },
    });
    // A 3×2 sprite is centred in the smallest box (12): left 4, top 5.
    expect(svg).toBe(
      '<svg viewBox="0 0 12 12" shape-rendering="crispEdges"><path fill="#111111" d="M4 5h2v1h-2zM4 6h1v1h-1z"/><path fill="#222222" d="M6 5h1v1h-1zM6 6h1v1h-1z"/></svg>',
    );
    // A full 16×16 block keeps its own size.
    expect(
      spriteSvg(materialSprite("dirt") ?? { rows: [], palette: {} }),
    ).toContain('viewBox="0 0 16 16"');
  });

  it("fall back to a lettered swatch", () => {
    expect(materialIconHtml("sculk_sensor")).toBe(
      '<span class="mc-icon mc-swatch mc-c-7" data-size="small" aria-hidden="true">S</span>',
    );
    expect(materialIconHtml("bell")).toContain('class="mc-icon mc-pixel"');
  });
});
