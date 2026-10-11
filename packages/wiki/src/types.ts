/**
 * What a wiki component is. Each one is a module (src/components/) that says what
 * it's called, which set it belongs to, how it's written (for the generated
 * documentation), and how it renders: on the server, to HTML, from what was typed.
 * A component never trusts its input: everything typed is escaped or rendered as
 * wiki Markdown (which has HTML off) through the context.
 */

/** A group of components a wiki can switch on (wikis.component_sets). */
export interface ComponentSet {
  id: string;
  label: string;
  description: string;
  /** Every wiki has it; it can't be switched off. */
  always?: boolean;
}

/** What a component can use while rendering. */
export interface RenderContext {
  /** Wiki Markdown (blocks) to HTML: links, components and all. */
  markdown(text: string): string;
  /** Wiki Markdown (one line, no blocks) to HTML. */
  inline(text: string): string;
  escape(text: string): string;
  /** A visible error box (or inline note) in place of the component. */
  error(message: string): string;
  /** The page being rendered (an infobox's default title). */
  pageTitle: string;
  /** Puts the page in a category ("Stubs"). */
  addCategory(name: string): void;
  /** How deep in other components this one is (0: at the top of the page). */
  depth: number;
  /** The address of a page in this wiki. */
  href(title: string): string;
  /** Records a link to a page (backlinks, wanted pages, re-rendering). */
  link(title: string): void;
  /** Something the wiki provides for rendering (e.g. "items": an ItemLookup). */
  resource(name: string): unknown;
  /** Hands something back to the wiki (e.g. "item": the item a page defines). */
  emit(channel: string, value: unknown): void;
  /** An id unique on the page, for aria references. */
  id(prefix: string): string;
  /** The image's address if the wiki allows it (published files), else null. */
  imageUrl(url: string): string | null;
}

interface ComponentBase {
  name: string;
  set: string;
  /** One line for the documentation page. */
  summary: string;
  /** How it's written: shown, and rendered as the live example. */
  example: string;
  /** More about its options, one item per line in the documentation. */
  notes?: readonly string[];
}

/** `::: name argument` … `:::` (or `::: name argument :::` on one line). */
export interface BlockComponent extends ComponentBase {
  kind: "block";
  render(
    input: { argument: string; body: string },
    context: RenderContext,
  ): string;
}

/** `{{name argument}}` inside a line of text. */
export interface InlineComponent extends ComponentBase {
  kind: "inline";
  render(argument: string, context: RenderContext): string;
}

export type WikiComponent = BlockComponent | InlineComponent;

/** One `key: value` line of a component's body. */
export interface Field {
  key: string;
  value: string;
}
