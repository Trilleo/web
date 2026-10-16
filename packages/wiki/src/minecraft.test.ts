import { describe, expect, it } from "vitest";
import { linked, render } from "./test-render";
import { itemKey, parseItemBlock } from "./minecraft/items";
import { materialName, parseSlot } from "./components/menu";
import { mcRuns, renderMcText, stripMcCodes } from "./minecraft/text";

describe("Minecraft text", () => {
  it("splits § codes into styled runs; a colour clears formats", () => {
    expect(mcRuns("§6§lBold gold§r plain §cred")).toEqual([
      { text: "Bold gold", color: "6", formats: ["bold"] },
      { text: " plain ", color: null, formats: [] },
      { text: "red", color: "c", formats: [] },
    ]);
    expect(mcRuns("§l§nboth§9blue")).toEqual([
      { text: "both", color: null, formats: ["bold", "underline"] },
      { text: "blue", color: "9", formats: [] },
    ]);
    expect(stripMcCodes("§aGreen §x stays")).toBe("Green §x stays");
  });

  it("escapes text and hides obfuscated runs from screen readers", () => {
    expect(renderMcText("§c<b>")).toBe('<span class="mc-c-c">&lt;b&gt;</span>');
    expect(renderMcText("§kxyz")).toBe(
      '<span class="mc-obfuscated" aria-hidden="true">xyz</span>',
    );
  });
});

describe("items", () => {
  it("are read from an item block", () => {
    const { item, rows, problems } = parseItemBlock(
      "name: §6Hyperion\nrarity: Legendary\ntype: sword\nlore: §7Damage: §c+260\nlore:\nlore: Ability\nObtained from: [[Necron]]\nnot a field\nrarity: shiny",
      "Hyperion",
    );
    expect(item).toEqual({
      name: "§6Hyperion",
      rarity: "legendary",
      type: "SWORD",
      icon: null,
      lore: ["§7Damage: §c+260", "", "Ability"],
    });
    expect(rows).toEqual([{ key: "Obtained from", value: "[[Necron]]" }]);
    expect(problems).toHaveLength(2);
    expect(itemKey("§6Hyper_ion  X")).toBe("hyper ion x");
  });
});

describe("Minecraft components", () => {
  it("{{mc}} and ::: mc show the game's text", () => {
    expect(render("{{mc §6Gold}}").html).toContain(
      '<span class="mc-text"><span class="mc-c-6">Gold</span></span>',
    );
    expect(render("::: mc\n§aOne\n\n§bTwo\n:::").html).toMatch(
      /mc-block.*mc-c-a.*&nbsp;.*mc-c-b/s,
    );
  });

  it("are off unless the wiki switches the set on", () => {
    expect(render("{{mc §6Gold}}", ["core"]).html).toContain("switched on");
  });

  it("{{item}} shows icon, name and tooltip, and links the item's page", () => {
    linked.length = 0;
    const { html } = render("Use {{item aspect of the end x2}}.");
    expect(html).toContain('href="/sky/Item:Aspect_of_the_End"');
    expect(html).toContain('<span class="mc-c-9">Aspect of the End</span>');
    expect(html).toContain(" ×2");
    expect(html).toMatch(
      /aria-describedby="(mc-tooltip-\d+)".*role="tooltip" id="\1"/s,
    );
    expect(html).toContain("RARE SWORD");
    expect(html).toContain('class="mc-icon mc-swatch mc-c-9"');
    expect(linked).toContain("Item:Aspect of the End");
  });

  it("an unknown item links to the page that would describe it", () => {
    linked.length = 0;
    const { html } = render("{{item Mystery Box}}");
    expect(html).toContain(
      'class="mc-item-link is-missing" href="/sky/Item:Mystery_Box"',
    );
    expect(linked).toEqual(["Item:Mystery Box"]);
  });

  it("::: item defines the page's item and draws its infobox", () => {
    const { html, env } = render(
      "::: item\nrarity: epic\nlore: §7Old.\nWeight: 2\n:::",
      ["core", "minecraft"],
      "Item:Old Boot",
    );
    expect(html).toContain(
      '<section class="wiki-infobox mc-infobox" aria-label="Old Boot" data-placement="page">',
    );
    expect(html).toContain('<span class="mc-tooltip" data-static>');
    expect(html).toContain("<dt>Weight</dt><dd>2</dd>");
    expect(env.components?.emitted?.get("item")).toEqual([
      {
        key: "old boot",
        page: "Item:Old Boot",
        name: "Old Boot",
        rarity: "epic",
        type: null,
        icon: null,
        lore: ["§7Old."],
      },
    ]);
    const elsewhere = render(
      "::: item\nrarity: epic\n:::",
      ["core", "minecraft"],
      "Boots",
    );
    expect(elsewhere.html).toContain(
      "Items are described on pages called Item:",
    );
    expect(elsewhere.env.components?.emitted).toBeUndefined();
  });

  it("::: item-infobox shows a known item, and says so for an unknown one", () => {
    expect(
      render("::: item-infobox Enchanted Diamond\nSold by: Bob\n:::").html,
    ).toContain("<dt>Sold by</dt>");
    expect(render("::: item-infobox Nope\n:::").html).toContain(
      "no item called “Nope”",
    );
  });

  it("::: inventory lays out slots by number, range and row", () => {
    const { html } = render(
      "::: inventory 2x4 §6Chest\n1: Enchanted Diamond x64\n3-4: Aspect of the End\nrow 2: , Enchanted Diamond\n:::",
    );
    expect(html).toContain('data-cols="4" role="group" aria-label="Chest"');
    const slots = html.match(/class="mc-slot[" ]/g) ?? [];
    expect(slots).toHaveLength(8);
    expect(html.match(/data-slot/g)).toHaveLength(4);
    expect(html).toContain('aria-label="Enchanted Diamond, 64"');
    expect(html).toContain(
      '<span class="mc-count" aria-hidden="true">64</span>',
    );
    expect(
      render(
        "::: inventory 1x2\n5: Enchanted Diamond\nnonsense\n:::",
      ).html.match(/class="wiki-error"/g),
    ).toHaveLength(2);
    expect(render("::: inventory 20\n:::").html).toContain("1–12 rows");
  });
});

describe("::: menu", () => {
  it("reads a slot: material, count, glow, name, lore, rules and a link", () => {
    expect(
      parseSlot(
        "Lime_Dye x3 glow | §aPvP | | §7Status: §aON | -- | §eClick! -> Town menu#Settings",
      ),
    ).toEqual({
      material: "lime_dye",
      count: 3,
      glow: true,
      name: "§aPvP",
      lore: ["", "§7Status: §aON", null, "§eClick!"],
      target: "Town menu#Settings",
    });
    expect(parseSlot("bell")).toEqual({
      material: "bell",
      count: null,
      glow: false,
      name: null,
      lore: [],
      target: null,
    });
    expect(parseSlot("Lime Dye glow x2")).toMatchObject({
      material: "lime_dye",
      count: 2,
      glow: true,
    });
    expect(parseSlot("glow")).toMatchObject({ material: "glow", glow: false });
    expect(parseSlot("not a <material>")).toContain("isn't a material");
    expect(materialName("minecraft:black_stained_glass_pane")).toBe(
      "Black Stained Glass Pane",
    );
  });

  it("lays out a chest with filler, buttons, links and tooltips", () => {
    linked.length = 0;
    const { html } = render(
      "::: menu 2 §8Town\nfill: black_stained_glass_pane\n0: bell | §6Riverside | Lore line | -- | §eClick! -> Town menu\n2, 4-5: paper x2 | Note\n10: lime_dye glow\n:::",
    );
    expect(html).toContain(
      '<figure class="mc-inventory mc-menu" data-inventory>',
    );
    expect(html).toContain('role="group" aria-label="Town"');
    expect(html.match(/class="mc-slot[ "]/g)).toHaveLength(18);
    // Four buttons (0, 2, 4, 5) and the dye; the rest is filler without tooltips.
    expect(html.match(/data-slot/g)).toHaveLength(5);
    expect(html.match(/class="mc-slot mc-filler"/g)).toHaveLength(13);
    expect(html.match(/role="tooltip"/g)).toHaveLength(5);
    expect(html).toContain('href="/sky/Town_menu"');
    expect(linked).toContain("Town menu");
    expect(html).toContain(
      '<span class="mc-line mc-rule" aria-hidden="true"></span>',
    );
    // Lore without a colour is grey; a name without one is white.
    expect(html).toContain('<span class="mc-c-7">Lore line</span>');
    expect(html).toContain('<span class="mc-c-f">Note</span>');
    expect(html).toContain(
      '<span class="mc-count" aria-hidden="true">2</span>',
    );
    // Unnamed slots are labelled with their material.
    expect(html).toMatch(
      /class="mc-slot-item is-glowing" role="img" tabindex="0" aria-label="Lime Dye"/,
    );
    expect(html).toContain('class="mc-icon mc-pixel"');
  });

  it("reports slots outside the menu and lines it can't read", () => {
    const { html } = render("::: menu 1\n9: bell\nwhat\n0: <b>\n:::");
    expect(html.match(/class="wiki-error"/g)).toHaveLength(3);
    expect(html).toContain("outside a 1-row menu (slots 0–8)");
    expect(html).not.toContain("<b>");
    expect(render("::: menu 7\n:::").html).toContain("1–6 rows");
  });

  it("escapes names and lore", () => {
    const { html } = render(
      '::: menu 1\n0: bell | <img src=x> | "quoted" & <i>\n:::',
    );
    expect(html).not.toContain("<img src=x>");
    expect(html).not.toContain("<i>");
    expect(html).toContain("&lt;img src=x&gt;");
  });
});
