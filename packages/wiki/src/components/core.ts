/**
 * The core set, which every wiki has: infobox, notice, tabs, collapse, navbox,
 * columns, badge, kbd, stub and outdated.
 */
import {
  firstWord,
  parseField,
  parseSectionLine,
  splitSections,
} from "../syntax";
import type { BlockComponent, InlineComponent, RenderContext } from "../types";

const CORE = "core";

/** `key: value` rows (and `== Section ==` lines) as definition lists. */
function fieldRows(
  body: string,
  context: RenderContext,
): {
  image: string | null;
  caption: string | null;
  html: string;
} {
  let image: string | null = null;
  let caption: string | null = null;
  const parts: string[] = [];
  let rows: string[] = [];
  const flush = () => {
    if (rows.length > 0) parts.push(`<dl>${rows.join("")}</dl>`);
    rows = [];
  };
  for (const line of body.split("\n")) {
    if (line.trim() === "") continue;
    const section = parseSectionLine(line);
    if (section !== null) {
      flush();
      parts.push(
        `<p class="wiki-infobox-section">${context.inline(section)}</p>`,
      );
      continue;
    }
    const field = parseField(line);
    if (field?.key.toLowerCase() === "image") {
      image = field.value;
    } else if (field?.key.toLowerCase() === "caption") {
      caption = field.value;
    } else if (field) {
      rows.push(
        `<div class="wiki-infobox-row"><dt>${context.inline(field.key)}</dt><dd>${context.inline(field.value)}</dd></div>`,
      );
    } else {
      flush();
      parts.push(
        `<p class="wiki-infobox-note">${context.inline(line.trim())}</p>`,
      );
    }
  }
  flush();
  return { image, caption, html: parts.join("") };
}

const infobox: BlockComponent = {
  kind: "block",
  name: "infobox",
  set: CORE,
  summary:
    "The facts box: a title, an optional picture, and labelled rows. At the top of a page it sits beside the text on wide screens.",
  example: `::: infobox Wheat
Skill: [[Farming]]
Sells for: 2 coins
== Minion ==
Tier I: one every 30 s
:::`,
  notes: [
    "The title follows the name; without one, it's the page's title.",
    "Each line is `Label: value` (the value can have links and formatting).",
    "`image:` takes a published file's address (files.trilleo.net); `caption:` describes it.",
    "`== Section ==` starts a group of rows.",
  ],
  render({ argument, body }, context) {
    const title = argument || context.pageTitle;
    const { image, caption, html } = fieldRows(body, context);
    const picture = image
      ? `<figure class="wiki-infobox-image">${context.inline(`![${caption ?? title}](${image})`)}${caption ? `<figcaption>${context.inline(caption)}</figcaption>` : ""}</figure>`
      : "";
    // The first one at the top of a page moves beside the text on wide screens.
    const placement = context.depth === 0 ? ' data-placement="page"' : "";
    return `<section class="wiki-infobox" aria-label="${context.escape(title)}"${placement}><p class="wiki-infobox-title">${context.inline(title)}</p>${picture}${html}</section>\n`;
  },
};

const NOTICE_TONES = {
  note: "Note",
  tip: "Tip",
  info: "Information",
  warning: "Warning",
  danger: "Danger",
  outdated: "Out of date",
  spoiler: "Spoiler",
} as const;
type NoticeTone = keyof typeof NOTICE_TONES;

const notice: BlockComponent = {
  kind: "block",
  name: "notice",
  set: CORE,
  summary:
    "A callout: a note, tip, warning, danger, out-of-date notice, or a spoiler that stays closed until opened.",
  example: `::: notice warning Before you start
Back up your world: **this can't be undone**.
:::

::: notice spoiler How the boss fight ends
It runs away.
:::`,
  notes: [
    `Kinds: ${Object.keys(NOTICE_TONES).join(", ")} (note when left out).`,
    "Anything after the kind is its title.",
  ],
  render({ argument, body }, context) {
    const [word, rest] = firstWord(argument);
    const known = Object.hasOwn(NOTICE_TONES, word.toLowerCase());
    const tone: NoticeTone = known
      ? (word.toLowerCase() as NoticeTone)
      : "note";
    const title = (known ? rest : argument) || NOTICE_TONES[tone];
    const label = context.inline(title);
    const content = context.markdown(body);
    if (tone === "spoiler") {
      return `<details class="wiki-notice" data-tone="spoiler"><summary class="wiki-notice-label">${label}</summary><div class="wiki-notice-body">${content}</div></details>\n`;
    }
    const kind =
      title === NOTICE_TONES[tone]
        ? ""
        : `<span class="sr-only">${NOTICE_TONES[tone]}: </span>`;
    return `<div class="wiki-notice" data-tone="${tone}" role="note"><p class="wiki-notice-label">${kind}${label}</p><div class="wiki-notice-body">${content}</div></div>\n`;
  },
};

const tabs: BlockComponent = {
  kind: "block",
  name: "tabs",
  set: CORE,
  summary:
    "Panels to switch between (Java and Bedrock, one per version). Without JavaScript they show one under another.",
  example: `::: tabs
== Java ==
Press {{kbd F3}} to see your coordinates.
== Bedrock ==
Turn on **Show coordinates** in the world's settings.
:::`,
  notes: ["Each `== Label ==` line starts a tab."],
  render({ body }, context) {
    const sections = splitSections(body);
    const labelled = sections.filter((section) => section.label !== null);
    if (labelled.length === 0)
      return context.error("Tabs need `== Label ==` lines, one per tab.");
    const intro = sections.find((section) => section.label === null);
    const panels = labelled
      .map(
        (section) =>
          `<section class="wiki-tab" data-tab><p class="wiki-tab-label" data-tab-label>${context.inline(section.label ?? "")}</p><div class="wiki-tab-panel">${context.markdown(section.body)}</div></section>`,
      )
      .join("");
    return `${intro ? context.markdown(intro.body) : ""}<div class="wiki-tabs" data-tabs>${panels}</div>\n`;
  },
};

const collapse: BlockComponent = {
  kind: "block",
  name: "collapse",
  set: CORE,
  summary:
    "A section that opens when clicked: long lists, details most readers skip.",
  example: `::: collapse Every drop, with chances
- String: 100%
- Spider Eye: 30%
:::`,
  notes: ["`::: collapse open Title` starts it open."],
  render({ argument, body }, context) {
    const [word, rest] = firstWord(argument);
    const open = word.toLowerCase() === "open";
    const title = (open ? rest : argument) || "More";
    return `<details class="wiki-collapse"${open ? " open" : ""}><summary>${context.inline(title)}</summary><div class="wiki-collapse-body">${context.markdown(body)}</div></details>\n`;
  },
};

const navbox: BlockComponent = {
  kind: "block",
  name: "navbox",
  set: CORE,
  summary:
    "A box of related pages, usually at the bottom of each of them: groups of links under one title.",
  example: `::: navbox Mining
Ores: [[Coal]] · [[Iron]] · [[Gold]]
Tools: [[Wooden Pickaxe]] · [[Stone Pickaxe]]
:::`,
  notes: [
    "The title follows the name.",
    "Each line is `Group: links`; a line without a group is shown as it is.",
  ],
  render({ argument, body }, context) {
    if (!argument)
      return context.error("A navbox needs a title: ::: navbox Title");
    const rows = body
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => {
        const field = parseField(line);
        return field
          ? `<div class="wiki-navbox-row"><span class="wiki-navbox-group">${context.inline(field.key)}</span><span>${context.inline(field.value)}</span></div>`
          : `<div class="wiki-navbox-row"><span>${context.inline(line.trim())}</span></div>`;
      })
      .join("");
    return `<nav class="wiki-navbox" aria-label="${context.escape(argument)}"><details open><summary class="wiki-navbox-title">${context.inline(argument)}</summary><div class="wiki-navbox-rows">${rows}</div></details></nav>\n`;
  },
};

const columns: BlockComponent = {
  kind: "block",
  name: "columns",
  set: CORE,
  summary: "Lays a long list out in columns on wider screens (one on phones).",
  example: `::: columns 3
- [[Coal]]
- [[Iron]]
- [[Gold]]
- [[Oak Log]]
- [[Birch Log]]
- [[Spruce Log]]
:::`,
  notes: ["2, 3 or 4 columns (2 when left out)."],
  render({ argument, body }, context) {
    const count = argument === "" ? 2 : Number(argument);
    if (!Number.isInteger(count) || count < 2 || count > 4)
      return context.error("Columns take 2, 3 or 4.");
    return `<div class="wiki-columns" data-columns="${String(count)}">${context.markdown(body)}</div>\n`;
  },
};

const BADGE_TONES = ["neutral", "accent", "muted"] as const;

const badge: InlineComponent = {
  kind: "inline",
  name: "badge",
  set: CORE,
  summary: "A small label in the text: a status, a version, a tag.",
  example:
    "{{badge Stable}} {{badge accent New in 1.2}} {{badge muted Removed}}",
  notes: [`Tones: ${BADGE_TONES.join(", ")} (neutral when left out).`],
  render(argument, context) {
    const [word, rest] = firstWord(argument);
    const known =
      (BADGE_TONES as readonly string[]).includes(word) && rest !== "";
    const text = known ? rest : argument;
    if (!text) return context.escape("{{badge}}");
    return `<span class="wiki-badge" data-tone="${known ? word : "neutral"}">${context.inline(text)}</span>`;
  },
};

const kbd: InlineComponent = {
  kind: "inline",
  name: "kbd",
  set: CORE,
  summary: "Keys to press, one or several together.",
  example: "Press {{kbd E}} to use, or {{kbd Ctrl+Shift+S}} to save a copy.",
  notes: ["Join keys pressed together with +."],
  render(argument, context) {
    const keys = argument
      .split(/\s*\+\s*/)
      .map((key) => key.trim())
      .filter(Boolean);
    if (keys.length === 0) return context.escape("{{kbd}}");
    return `<span class="wiki-keys">${keys.map((key) => `<kbd>${context.escape(key)}</kbd>`).join("+")}</span>`;
  },
};

const stub: BlockComponent = {
  kind: "block",
  name: "stub",
  set: CORE,
  summary: "Marks a page as unfinished and lists it in Category:Stubs.",
  example: `::: stub :::

::: stub
Missing: the drop table.
:::`,
  notes: ["On one line (`::: stub :::`), or with a note about what's missing."],
  render({ body }, context) {
    context.addCategory("Stubs");
    const note = body.trim() ? context.markdown(body) : "";
    return `<div class="wiki-notice" data-tone="stub" role="note"><p class="wiki-notice-label">Unfinished page</p><div class="wiki-notice-body"><p>This page is a stub: it needs more. Members of this wiki can add to it.</p>${note}</div></div>\n`;
  },
};

const outdated: BlockComponent = {
  kind: "block",
  name: "outdated",
  set: CORE,
  summary:
    "Says a page may no longer be right, and lists it in Category:Outdated pages.",
  example: "::: outdated 1.2 :::",
  notes: ["What follows the name is the version (or date) it was right for."],
  render({ argument, body }, context) {
    context.addCategory("Outdated pages");
    const since = argument ? ` It describes ${context.inline(argument)}.` : "";
    const note = body.trim() ? context.markdown(body) : "";
    return `<div class="wiki-notice" data-tone="outdated" role="note"><p class="wiki-notice-label">Out of date</p><div class="wiki-notice-body"><p>This page may no longer be right.${since}</p>${note}</div></div>\n`;
  },
};

export const CORE_COMPONENTS = [
  infobox,
  notice,
  tabs,
  collapse,
  navbox,
  columns,
  stub,
  outdated,
  badge,
  kbd,
] as const;
