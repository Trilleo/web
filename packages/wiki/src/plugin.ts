/**
 * The markdown-it plugin: block components (`::: name argument` … `:::`, nesting
 * allowed, or `::: name argument :::` on one line) and inline ones
 * (`{{name argument}}`). Each is rendered by its component from the registry, with
 * a context that renders wiki Markdown through the same parser (so links, categories
 * and nested components work inside). A component that doesn't exist, isn't
 * switched on for this wiki, or fails, renders as a visible error instead.
 */
import type {
  Env,
  MarkdownIt as Markdown,
  StateBlock,
  StateInline,
  Token,
} from "markdown-it";
import { escapeHtml } from "./syntax";
import type { RenderContext, WikiComponent } from "./types";

const NAME = /^[a-z][a-z0-9-]*$/;
const OPENER = /^:::\s*([a-z][a-z0-9-]*)(?:\s+(.*?))?\s*$/;
const CLOSER = /^:::\s*$/;

/** What the wiki gives components, besides rendering Markdown. */
export interface ComponentHost {
  href(title: string): string;
  link(title: string): void;
  /** Allowed images' addresses; others give null. */
  imageUrl(url: string): string | null;
  resources: Readonly<Record<string, unknown>>;
}

/** What the plugin keeps in markdown-it's env while a page renders. */
export interface ComponentState {
  /** Component sets switched on for this wiki. */
  sets: ReadonlySet<string>;
  pageTitle: string;
  /** Category names components asked for. */
  categories: string[];
  depth: number;
  host?: ComponentHost;
  /** What components emitted, by channel. */
  emitted?: Map<string, unknown[]>;
  /** For `id()`. */
  ids?: number;
}

/** A host that links nowhere and has nothing: tests and the documentation's defaults. */
export const BARE_HOST: ComponentHost = {
  href: (title) => `/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  link: () => undefined,
  imageUrl: () => null,
  resources: {},
};

/** markdown-it's env (an open record) with the plugin's state in it. */
export type ComponentEnv = Record<string, unknown> & {
  components?: ComponentState;
};

interface BlockMeta {
  name: string;
  argument: string;
  body: string;
  unclosed: boolean;
}

interface InlineMeta {
  name: string;
  argument: string;
}

function selfClosing(argument: string): boolean {
  return argument === ":::" || argument.endsWith(" :::");
}

function blockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  if ((state.sCount[startLine] ?? 0) - state.blkIndent >= 4) return false;
  const start = (state.bMarks[startLine] ?? 0) + (state.tShift[startLine] ?? 0);
  const line = state.src.slice(start, state.eMarks[startLine]);
  const open = OPENER.exec(line);
  if (!open?.[1]) return false;
  if (silent) return true;

  let argument = open[2] ?? "";
  let next = startLine;
  let unclosed = false;
  let body = "";
  if (selfClosing(argument)) {
    argument = argument.slice(0, -3).trim();
  } else {
    let depth = 1;
    for (next = startLine + 1; next < endLine; next += 1) {
      const text = state.src
        .slice(
          (state.bMarks[next] ?? 0) + (state.tShift[next] ?? 0),
          state.eMarks[next],
        )
        .trimEnd();
      const inner = OPENER.exec(text);
      if (inner && !selfClosing(inner[2] ?? "")) depth += 1;
      else if (CLOSER.test(text)) {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    unclosed = next >= endLine;
    body = state
      .getLines(startLine + 1, next, state.blkIndent, false)
      .replace(/\n$/, "");
  }

  const token = state.push("wiki_component", "", 0);
  token.block = true;
  token.map = [startLine, Math.min(next + 1, endLine)];
  token.meta = { name: open[1], argument, body, unclosed } satisfies BlockMeta;
  state.line = Math.min(next + 1, endLine);
  return true;
}

function inlineRule(state: StateInline, silent: boolean): boolean {
  const { src, pos } = state;
  if (src.charCodeAt(pos) !== 0x7b || src.charCodeAt(pos + 1) !== 0x7b)
    return false;
  const end = src.indexOf("}}", pos + 2);
  if (end === -1) return false;
  const inner = src.slice(pos + 2, end).trim();
  const space = inner.search(/\s/);
  const name = space === -1 ? inner : inner.slice(0, space);
  if (!NAME.test(name) || inner.includes("\n")) return false;
  if (!silent) {
    const token = state.push("wiki_inline_component", "", 0);
    token.meta = {
      name,
      argument: space === -1 ? "" : inner.slice(space).trim(),
    } satisfies InlineMeta;
  }
  state.pos = end + 2;
  return true;
}

export function errorBox(message: string, inline: boolean): string {
  const text = escapeHtml(message);
  return inline
    ? `<span class="wiki-error" role="note">${text}</span>`
    : `<div class="wiki-error" role="note"><span class="wiki-error-label">Component error</span> ${text}</div>\n`;
}

/** Adds wiki components to a markdown-it instance. */
export function componentPlugin(
  md: Markdown,
  components: readonly WikiComponent[],
): void {
  // A block and an inline component may share a name (::: item and {{item}}).
  const byName = new Map<string, WikiComponent[]>();
  for (const component of components)
    byName.set(component.name, [
      ...(byName.get(component.name) ?? []),
      component,
    ]);

  md.block.ruler.before("fence", "wiki_component", blockRule, {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });
  md.inline.ruler.before("link", "wiki_inline_component", inlineRule);

  const stateOf = (env: ComponentEnv): ComponentState => {
    env.components ??= {
      sets: new Set(["core"]),
      pageTitle: "",
      categories: [],
      depth: 0,
    };
    return env.components;
  };

  const context = (
    env: ComponentEnv,
    state: ComponentState,
    depth: number,
  ): RenderContext => {
    const host = state.host ?? BARE_HOST;
    return {
      markdown: (text) => md.render(text, env),
      inline: (text) => md.renderInline(text, env),
      escape: escapeHtml,
      error: (message) => errorBox(message, false),
      pageTitle: state.pageTitle,
      addCategory: (name) => {
        if (!state.categories.includes(name)) state.categories.push(name);
      },
      depth,
      href: (title) => host.href(title),
      link: (title) => {
        host.link(title);
      },
      resource: (name) => host.resources[name],
      emit: (channel, value) => {
        state.emitted ??= new Map();
        state.emitted.set(channel, [
          ...(state.emitted.get(channel) ?? []),
          value,
        ]);
      },
      id: (prefix) => {
        state.ids = (state.ids ?? 0) + 1;
        return `${prefix}-${String(state.ids)}`;
      },
      imageUrl: (url) => host.imageUrl(url),
    };
  };

  const lookup = (
    name: string,
    kind: WikiComponent["kind"],
    state: ComponentState,
  ) => {
    const found = byName.get(name);
    if (!found) return `There's no component called “${name}”.`;
    const component = found.find((candidate) => candidate.kind === kind);
    if (!component)
      return kind === "block"
        ? `“${name}” goes inside a line: {{${name} …}}.`
        : `“${name}” is a block: ::: ${name} … :::.`;
    if (!state.sets.has(component.set))
      return `“${name}” isn't switched on for this wiki (it's in the ${component.set} set).`;
    return component;
  };

  md.renderer.rules.wiki_component = (
    tokens: Token[],
    idx,
    _options,
    rawEnv?: Env,
  ) => {
    const env = (rawEnv ?? {}) as ComponentEnv;
    const meta = tokens[idx]?.meta as unknown as BlockMeta;
    const state = stateOf(env);
    const found = lookup(meta.name, "block", state);
    if (typeof found === "string") return errorBox(found, false);
    if (found.kind !== "block") return "";
    state.depth += 1;
    try {
      const html = found.render(
        { argument: meta.argument, body: meta.body },
        context(env, state, state.depth - 1),
      );
      return meta.unclosed
        ? errorBox(`“${meta.name}” has no closing ::: line.`, false) + html
        : html;
    } catch (error) {
      return errorBox(
        `“${meta.name}” couldn't be shown: ${error instanceof Error ? error.message : "it failed"}.`,
        false,
      );
    } finally {
      state.depth -= 1;
    }
  };

  md.renderer.rules.wiki_inline_component = (
    tokens: Token[],
    idx,
    _options,
    rawEnv?: Env,
  ) => {
    const env = (rawEnv ?? {}) as ComponentEnv;
    const meta = tokens[idx]?.meta as unknown as InlineMeta;
    const state = stateOf(env);
    const found = lookup(meta.name, "inline", state);
    if (typeof found === "string") return errorBox(found, true);
    if (found.kind !== "inline") return "";
    try {
      return found.render(meta.argument, context(env, state, state.depth));
    } catch (error) {
      return errorBox(
        `“${meta.name}”: ${error instanceof Error ? error.message : "it failed"}.`,
        true,
      );
    }
  };
}

/** The text of a component token, for search snippets. */
export function componentSource(token: Token): string | null {
  if (token.type === "wiki_component") {
    const meta = token.meta as unknown as BlockMeta;
    return `${meta.argument}\n${meta.body}`;
  }
  if (token.type === "wiki_inline_component")
    return (token.meta as unknown as InlineMeta).argument;
  return null;
}
