import { describe, expect, test } from "vitest";
import { breakableTex, renderMath } from "./math";

describe("inline maths", () => {
  test("may break after commas outside braces", () => {
    expect(
      breakableTex("R=\\{\\langle a,b\\rangle, \\langle b,c\\rangle\\}"),
    ).toBe(
      "R=\\{\\langle a,\\allowbreak b\\rangle,\\allowbreak  \\langle b,\\allowbreak c\\rangle\\}",
    );
    // Not inside braces, and not after a thin space.
    expect(breakableTex("f_{1,2}\\,x")).toBe("f_{1,2}\\,x");
    expect(breakableTex("\\text{a, b}")).toBe("\\text{a, b}");
  });

  test("renders the same symbols, display maths untouched", () => {
    const errors: string[] = [];
    const inline = renderMath("A=\\{1,2,3\\}", false, { mathErrors: errors });
    expect(errors).toEqual([]);
    expect(inline).toContain("katex");
    expect(renderMath("A=\\{1,2\\}", true)).not.toContain("allowbreak");
  });
});
