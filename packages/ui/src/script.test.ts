import { describe, expect, it } from "vitest";
import { scriptLiteral } from "./script";

// The literal stays valid JSON, so JSON.parse reads it as a script would.
describe("scriptLiteral", () => {
  it("round-trips ordinary values", () => {
    for (const value of [
      "trilleo-theme",
      "(prefers-color-scheme: dark)",
      4,
      true,
      null,
    ]) {
      expect(JSON.parse(scriptLiteral(value))).toBe(value);
    }
  });

  it("can't close the script element", () => {
    const literal = scriptLiteral("</script><script>alert(1)</script>");
    expect(literal).not.toMatch(/[<>]/);
    expect(JSON.parse(literal)).toBe("</script><script>alert(1)</script>");
  });

  it("escapes quotes, backslashes and line separators", () => {
    const value = 'a"b\\c\n\u2028\u2029';
    const literal = scriptLiteral(value);
    expect(literal).not.toMatch(/[\n\u2028\u2029]/);
    expect(JSON.parse(literal)).toBe(value);
  });
});
