import { describe, expect, it } from "vitest";
import {
  categoryName,
  categoryTitle,
  namespaceOf,
  normalizeTitle,
  titleFromPath,
  titleKey,
  titlePath,
} from "./titles";

describe("normalizeTitle", () => {
  it("tidies spaces and underscores and capitalizes the first letter", () => {
    expect(normalizeTitle("  iron_ore  ")).toBe("Iron ore");
    expect(normalizeTitle("enchanted   diamond")).toBe("Enchanted diamond");
    expect(normalizeTitle("ärger")).toBe("Ärger");
  });

  it("knows the Category namespace, in any case", () => {
    expect(normalizeTitle("category:items")).toBe("Category:Items");
    expect(normalizeTitle("CATEGORY: weapons")).toBe("Category:Weapons");
    expect(normalizeTitle("Category:")).toBeNull();
  });

  it("leaves other colons alone", () => {
    expect(normalizeTitle("Guide: mining")).toBe("Guide: mining");
  });

  it("allows subpages but not empty or relative segments", () => {
    expect(normalizeTitle("Guides/ Mining")).toBe("Guides/Mining");
    expect(normalizeTitle("Guides//Mining")).toBeNull();
    expect(normalizeTitle("Guides/../Admin")).toBeNull();
    expect(normalizeTitle("Guides/")).toBeNull();
  });

  it("refuses markup, reserved starts and overlong titles", () => {
    for (const bad of [
      "a#b",
      "a<b",
      "a]b",
      "a|b",
      "a{b",
      "a\\b",
      "-",
      "-/edit",
      "@sky:x",
      ":Category:x",
      "",
      "   ",
    ])
      expect(normalizeTitle(bad), bad).toBeNull();
    expect(normalizeTitle("x".repeat(201))).toBeNull();
    expect(normalizeTitle("x".repeat(200))).not.toBeNull();
  });
});

describe("keys and paths", () => {
  it("folds case for keys", () => {
    expect(titleKey("Iron Ore")).toBe(titleKey("iron ore"));
  });

  it("writes readable paths and reads them back", () => {
    expect(titlePath("Category:Iron Ore")).toBe("Category:Iron_Ore");
    expect(titlePath("Beginner's guide (2026)")).toBe(
      "Beginner's_guide_(2026)",
    );
    expect(titlePath("Guides/Mining 101")).toBe("Guides/Mining_101");
    expect(titlePath("100% ?")).toBe("100%25_%3F");
    expect(titleFromPath("Category:Iron_Ore")).toBe("Category:Iron Ore");
  });

  it("names namespaces", () => {
    expect(namespaceOf("Category:Items")).toBe("category");
    expect(namespaceOf("Items")).toBe("main");
    expect(categoryName("Category:Items")).toBe("Items");
    expect(categoryTitle("weapons")).toBe("Category:Weapons");
  });
});
