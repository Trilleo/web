/**
 * Blocks for the humanities: `::: timeline` (dated events, a numbered figure) and
 * `::: thinker` (a person's dates, works and ideas, which go in the glossary like a
 * definition). Both are plain HTML: nothing runs in the browser.
 */
import type { BlockComponent } from "@trilleo/wiki";
import type { GlossaryEntry } from "../types";
import {
  STUDY_SET,
  chinese,
  nextNumber,
  slugify,
  splitBilingual,
} from "./shared";

/** "1848 | *The Communist Manifesto* | 《共产党宣言》" → its date, event and Chinese. */
export function parseTimeline(body: string): {
  events: { date: string; text: string; zh: string | null }[];
  errors: string[];
} {
  const events: { date: string; text: string; zh: string | null }[] = [];
  const errors: string[] = [];
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [date = "", text = "", zh = "", ...extra] = trimmed
      .split("|")
      .map((part) => part.trim());
    if (!date || !text || extra.length > 0)
      errors.push(`“${trimmed}” isn't an event (date | what happened | 中文).`);
    else events.push({ date, text, zh: zh || null });
  }
  if (events.length === 0 && errors.length === 0)
    errors.push("A timeline needs at least one event: date | what happened.");
  return { events, errors };
}

const timeline: BlockComponent = {
  kind: "block",
  name: "timeline",
  set: STUDY_SET,
  summary:
    "Dated events in order, one per line: a numbered figure for the history of ideas.",
  example: `::: timeline Marx and Engels
1818 | Marx is born in Trier | 马克思诞生
1844 | Marx and Engels meet in Paris
1848 | They publish *The Communist Manifesto* | 《共产党宣言》
1867 | The first volume of *Capital* | 《资本论》第一卷
:::`,
  notes: [
    "One event per line: date | what happened | Chinese (optional). The date is any text (1845–46, c. 500 BC).",
    "Events are shown in the order written.",
  ],
  render({ argument, body }, context) {
    const { events, errors } = parseTimeline(body);
    if (errors.length > 0) return context.error(errors.join(" "));
    const number = nextNumber(context, "figure");
    const title = argument || "Timeline";
    const items = events.map(
      (event) =>
        `<li><span class="study-timeline-date">${context.escape(event.date)}</span><span class="study-timeline-event">${context.inline(event.text)}${chinese(event.zh, context)}</span></li>`,
    );
    return `<figure class="study-figure study-timeline" id="fig-${number.replace(/\./g, "-")}"><ol>${items.join("")}</ol><figcaption><span class="study-box-kind">Figure ${number}</span> ${context.inline(title)}</figcaption></figure>\n`;
  },
};

const THINKER_FIELDS = { dates: "Lived", works: "Key works" } as const;

const thinker: BlockComponent = {
  kind: "block",
  name: "thinker",
  set: STUDY_SET,
  summary:
    "A key thinker: dates, key works and what they contributed. The name goes in the subject's glossary.",
  example: `::: thinker Ludwig Feuerbach | 费尔巴哈
dates: 1804–1872
works: *The Essence of Christianity* (1841)
A German philosopher who turned Hegel's idealism back to materialism, but whose
materialism stayed **metaphysical**: humans as nature, not as practice.
:::`,
  notes: [
    "The name follows, then the Chinese name after a “|”.",
    "Optional first lines: dates: and works:. The rest is what they're known for (Markdown).",
  ],
  render({ argument, body }, context) {
    const [name, zh] = splitBilingual(argument);
    if (!name)
      return context.error("A thinker needs a name: ::: thinker Name | 中文");
    const fields: Partial<Record<keyof typeof THINKER_FIELDS, string>> = {};
    const lines = body.split("\n");
    while (lines.length > 0) {
      const match = /^\s*(dates|works):\s*(.*)$/.exec(lines[0] ?? "");
      if (!match) break;
      fields[match[1] as keyof typeof THINKER_FIELDS] = (match[2] ?? "").trim();
      lines.shift();
    }
    const about = lines.join("\n").trim();
    if (!about)
      return context.error(`Say what ${name} is known for, after the fields.`);
    const anchor = `thinker-${slugify(name)}`;
    const facts = (
      Object.keys(THINKER_FIELDS) as (keyof typeof THINKER_FIELDS)[]
    )
      .filter((key) => fields[key])
      .map(
        (key) =>
          `<dt>${THINKER_FIELDS[key]}</dt><dd>${context.inline(fields[key] ?? "")}</dd>`,
      );
    const factList = facts.length
      ? `<dl class="study-thinker-facts">${facts.join("")}</dl>`
      : "";
    const description = context.markdown(about);
    context.emit("glossary", {
      term: name,
      zh,
      definition: `${fields.dates ? `<p>(${context.escape(fields.dates)})</p>` : ""}${description}`,
      anchor,
    } satisfies GlossaryEntry);
    return `<div class="study-box" data-kind="thinker" id="${anchor}"><p class="study-box-label"><span class="study-box-kind">Thinker</span> <dfn>${context.inline(name)}</dfn>${chinese(zh, context)}</p>${factList}${description}</div>\n`;
  },
};

export const HUMANITIES_COMPONENTS = [timeline, thinker] as const;
