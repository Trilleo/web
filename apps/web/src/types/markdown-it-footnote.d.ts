// markdown-it-footnote ships no types (and @types/markdown-it-footnote targets the
// older @types/markdown-it, not markdown-it 15's own types).
declare module "markdown-it-footnote" {
  import type { MarkdownIt } from "markdown-it";
  const footnote: (md: MarkdownIt) => void;
  export default footnote;
}
