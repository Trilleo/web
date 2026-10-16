import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { KATEX_CSS_FILE, katexCss } from "../scripts/katex-css";

test("src/katex.css matches the installed KaTeX (run scripts/katex-css.ts)", () => {
  const css = katexCss();
  expect(readFileSync(KATEX_CSS_FILE, "utf8")).toBe(css);
  expect(css).toContain(".katex");
  expect(css).not.toMatch(/\.(?:woff|ttf)\)/);
});
