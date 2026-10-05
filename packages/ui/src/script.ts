/**
 * Helpers for the dependency-free inline `<head>` scripts (themeInitScript,
 * motionInitScript), which are built as strings.
 */

/**
 * `value` as a JavaScript literal that is safe inside a `<script>` element: JSON with
 * `<`, `>` and `/` escaped (so it can't close the tag) and line separators escaped,
 * which JSON.stringify leaves alone.
 */
export function scriptLiteral(value: string | number | boolean | null): string {
  return JSON.stringify(value).replace(
    /[<>/\u2028\u2029]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
