/** What the study components share: their set, numbering, islands and small helpers. */
import type { RenderContext } from "@trilleo/wiki";
import type { LogicProps, QuizProps, WidgetProps } from "../types";

export const STUDY_SET = "study";

/** What the lesson renderer lends components (context.resource("study")). */
export interface StudyResources {
  subject: string;
  /** The lesson's slug. */
  lesson: string;
  /** Card and question IDs given out so far (two alike is a mistake). */
  ids: Set<string>;
  /** The lesson's number, "2.3". */
  number: string;
  /** Counters per kind of numbered thing. */
  counters: Map<string, number>;
}

export function study(context: RenderContext): StudyResources {
  const resources = context.resource("study") as StudyResources | undefined;
  return (
    resources ?? {
      subject: "",
      lesson: "",
      ids: new Set(),
      number: "0",
      counters: new Map(),
    }
  );
}

/** The next number for a kind of thing in this lesson: "2.3.1". */
export function nextNumber(context: RenderContext, kind: string): string {
  const resources = study(context);
  const count = (resources.counters.get(kind) ?? 0) + 1;
  resources.counters.set(kind, count);
  return `${resources.number}.${String(count)}`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

/** "English | 中文" → ["English", "中文" or null]. */
export function splitBilingual(text: string): [string, string | null] {
  const bar = text.indexOf("|");
  if (bar === -1) return [text.trim(), null];
  return [text.slice(0, bar).trim(), text.slice(bar + 1).trim() || null];
}

export function chinese(
  zh: string | null,
  context: RenderContext,
  className = "study-zh",
): string {
  return zh
    ? `<span class="${className}" lang="zh-CN">${context.escape(zh)}</span>`
    : "";
}

export type IslandInput =
  | { name: "quiz"; props: Omit<QuizProps, "id"> }
  | { name: "plot" | "explore" | "circuit"; props: Omit<WidgetProps, "id"> }
  | { name: "logic"; props: Omit<LogicProps, "id"> };

export function island(context: RenderContext, value: IslandInput): string {
  const id = context.id("study-island");
  context.emit("island", { ...value, id, props: { ...value.props, id } });
  return `<study-island data-id="${id}"></study-island>\n`;
}
