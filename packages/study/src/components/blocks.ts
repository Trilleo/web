/**
 * The study set of components, written like the wiki's (`::: name argument` …
 * `:::`, `{{name argument}}`) and rendered by the same markdown-it plugin. They
 * number themselves within the lesson ("Definition 2.3.1", "(2.3.2)"), and hand
 * the glossary, formula sheet, flashcards and widgets back through `emit`.
 */
import {
  firstWord,
  splitSections,
  type BlockComponent,
  type InlineComponent,
  type RenderContext,
} from "@trilleo/wiki";
import { drawCircuit } from "../circuit/draw";
import { cardId, questionId, splitPin } from "../ids";
import { parseCircuit, simulationProblem } from "../circuit/parse";
import { loosePins } from "../circuit/solve";
import { checkData, parseQuiz, type QuestionSource } from "../quiz";
import type {
  CardEntry,
  FormulaEntry,
  GlossaryEntry,
  QuizQuestion,
} from "../types";
import { parseExplore, parsePlot } from "../widgets";
import { logicLatex, parseLogic } from "../logic";
import { LOGIC_COMPONENTS } from "./logic";
import { SET_COMPONENTS } from "./sets";
import { THERMO_COMPONENTS } from "./thermo";
import {
  STUDY_SET,
  chinese,
  island,
  nextNumber,
  slugify,
  splitBilingual,
  study,
} from "./shared";

export {
  STUDY_SET,
  slugify,
  splitBilingual,
  type StudyResources,
} from "./shared";

const CALLOUT_KINDS = {
  note: "Note",
  tip: "Tip",
  key: "Key idea",
  pitfall: "Common mistake",
  warning: "Warning",
  summary: "Summary",
  exam: "For the exam",
} as const;
type CalloutKind = keyof typeof CALLOUT_KINDS;

const callout: BlockComponent = {
  kind: "block",
  name: "callout",
  set: STUDY_SET,
  summary:
    "A note in the margin of the text: a key idea, tip, common mistake, warning, summary, or what the exam asks.",
  example: `::: callout pitfall Signs
Current flows **into** the + terminal of a component that absorbs power.
:::`,
  notes: [
    `Kinds: ${Object.keys(CALLOUT_KINDS).join(", ")} (note when left out).`,
    "Anything after the kind is its title.",
  ],
  render({ argument, body }, context) {
    const [first, rest] = firstWord(argument);
    const known = first in CALLOUT_KINDS;
    const kind: CalloutKind = known ? (first as CalloutKind) : "note";
    const title = known ? rest : argument;
    return `<div class="study-callout" data-kind="${kind}" role="note"><p class="study-callout-label">${CALLOUT_KINDS[kind]}${title ? `<span class="study-callout-title">${context.inline(title)}</span>` : ""}</p>${context.markdown(body)}</div>\n`;
  },
};

const define: BlockComponent = {
  kind: "block",
  name: "define",
  set: STUDY_SET,
  summary:
    "A numbered definition. Its term (and Chinese term) goes in the subject's glossary.",
  example: `::: define Resistance | 电阻
How strongly a component opposes current: $R = V/I$, in ohms (Ω).
:::`,
  notes: ["The term follows the name; the Chinese term after a “|”."],
  render({ argument, body }, context) {
    const [term, zh] = splitBilingual(argument);
    if (!term)
      return context.error(
        "A definition needs its term: ::: define Term | 中文",
      );
    const number = nextNumber(context, "definition");
    const anchor = `def-${slugify(term)}`;
    const definition = context.markdown(body);
    context.emit("glossary", {
      term,
      zh,
      definition,
      anchor,
    } satisfies GlossaryEntry);
    return `<div class="study-box" data-kind="definition" id="${anchor}"><p class="study-box-label"><span class="study-box-kind">Definition ${number}</span> <dfn>${context.inline(term)}</dfn>${chinese(zh, context)}</p>${definition}</div>\n`;
  },
};

function statement(
  name: string,
  label: string,
  summary: string,
): BlockComponent {
  return {
    kind: "block",
    name,
    set: STUDY_SET,
    summary,
    example: `::: ${name} Kirchhoff's current law | 基尔霍夫电流定律
The currents into any node add up to zero: $\\sum_k i_k = 0$.
:::`,
    notes: ["Its name follows (optional); the Chinese name after a “|”."],
    render({ argument, body }, context) {
      const [title, zh] = splitBilingual(argument);
      const number = nextNumber(context, name);
      const anchor = `${name}-${number.replace(/\./g, "-")}`;
      return `<div class="study-box" data-kind="${name}" id="${anchor}"><p class="study-box-label"><span class="study-box-kind">${label} ${number}</span>${title ? ` <span class="study-box-title">${context.inline(title)}</span>` : ""}${chinese(zh, context)}</p>${context.markdown(body)}</div>\n`;
    },
  };
}

const theorem = statement(
  "theorem",
  "Theorem",
  "A numbered theorem, stated formally.",
);
const law = statement(
  "law",
  "Law",
  "A numbered law or principle (Ohm's law, Kirchhoff's laws).",
);

const formula: BlockComponent = {
  kind: "block",
  name: "formula",
  set: STUDY_SET,
  summary:
    "A numbered equation with what its symbols mean. It goes on the subject's formula sheet.",
  example: `::: formula Ohm's law | 欧姆定律
$$V = IR$$
--
V | voltage across the resistor | V
I | current through it | A
R | resistance | Ω
:::`,
  notes: [
    "The equation comes first (display maths), then “--” and one line per symbol: symbol | meaning | unit.",
    "Symbols are maths (written without $).",
  ],
  render({ argument, body }, context) {
    const [name, zh] = splitBilingual(argument);
    if (!name)
      return context.error("A formula needs a name: ::: formula Ohm's law");
    const [equationSource = "", symbolSource = ""] = body.split(/^--\s*$/m);
    if (!equationSource.trim())
      return context.error(`“${name}” has no equation.`);
    const number = nextNumber(context, "formula");
    const anchor = `eq-${number.replace(/\./g, "-")}`;
    const equation = context.markdown(equationSource);
    const rows = symbolSource
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [symbol = "", meaning = "", unit = ""] = line
          .split("|")
          .map((part) => part.trim());
        // A plain cell: axe reads KaTeX's markup as an empty header.
        return `<tr><td class="study-symbol">${context.inline(`$${symbol}$`)}</td><td>${context.inline(meaning)}</td><td>${unit ? context.escape(unit) : "—"}</td></tr>`;
      });
    const symbols = rows.length
      ? `<div class="study-scroll" data-scroll-label="Symbols"><table class="study-symbols"><thead><tr><th scope="col">Symbol</th><th scope="col">Meaning</th><th scope="col">Unit</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`
      : "";
    context.emit("formula", {
      name,
      zh,
      number,
      anchor,
      equation,
      symbols,
    } satisfies FormulaEntry);
    return `<figure class="study-formula" id="${anchor}"><figcaption><span class="study-box-kind">Formula (${number})</span> ${context.inline(name)}${chinese(zh, context)}</figcaption><div class="study-formula-equation"><div class="study-formula-maths">${equation}</div><span class="study-eqno" aria-hidden="true">(${number})</span></div>${symbols}</figure>\n`;
  },
};

const example: BlockComponent = {
  kind: "block",
  name: "example",
  set: STUDY_SET,
  summary:
    "A numbered worked example: the problem, then steps that open one at a time.",
  example: `::: example A voltage divider
Find $V_\\text{out}$ when $V = 12$ V, $R_1 = 1$ kΩ and $R_2 = 2$ kΩ.
== Current ==
$I = V/(R_1 + R_2) = 4$ mA.
== Answer ==
$V_\\text{out} = I R_2 = 8$ V.
:::`,
  notes: [
    "The problem comes first; each “== Step ==” is a step, closed until opened (try first!).",
  ],
  render({ argument, body }, context) {
    const number = nextNumber(context, "example");
    const anchor = `example-${number.replace(/\./g, "-")}`;
    const sections = splitSections(body);
    const problem = sections[0]?.label === null ? sections.shift() : undefined;
    const steps = sections.map(
      (section, index) =>
        `<li><details class="study-step"><summary><span class="study-step-number">${String(index + 1)}</span> ${context.inline(section.label ?? "Step")}</summary><div class="study-step-body">${context.markdown(section.body)}</div></details></li>`,
    );
    return `<div class="study-box" data-kind="example" id="${anchor}"><p class="study-box-label"><span class="study-box-kind">Example ${number}</span>${argument ? ` <span class="study-box-title">${context.inline(argument)}</span>` : ""}</p>${problem ? context.markdown(problem.body) : ""}${steps.length ? `<ol class="study-steps">${steps.join("")}</ol>` : ""}</div>\n`;
  },
};

/** "$u_{ab} = -u_{ba}$" → "u_{ab} = -u_{ba}"; "**Ohm's** law" → "Ohm's law". */
export function plainOption(text: string): string {
  return text
    .replace(/\$/g, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function answerHtml(question: QuestionSource, context: RenderContext): string {
  if (question.kind === "choice" || question.kind === "multiple")
    return question.options
      .filter((option) => option.correct)
      .map((option) => context.inline(option.text))
      .join("; ");
  if (question.kind === "expression")
    return `<code>${context.escape(question.answer)}</code>`;
  if (question.kind === "logic")
    return context.inline(`$${logicLatex(parseLogic(question.answer))}$`);
  if (question.kind === "text")
    return context.escape(question.answer.split("|")[0]?.trim() ?? "");
  return context.escape(question.answer);
}

const quiz: BlockComponent = {
  kind: "block",
  name: "quiz",
  set: STUDY_SET,
  summary:
    "Questions checked as you answer: choices, numbers with units, algebra, or words, each with an explanation.",
  example: `::: quiz Check yourself
? What current flows through 10 Ω with 5 V across it?
answer: 0.5 A
> $I = V/R = 5/10 = 0.5$ A.

? Which are passive components?
- [x] Resistor
- [ ] Voltage source
- [x] Capacitor

? Simplify $2(x+1) - x$.
expression: x + 2
:::`,
  notes: [
    "“?” starts a question; options are “- [x]” (right) and “- [ ]”.",
    "answer: a number with its unit (prefixes are fine: 500 mA); tolerance: 2% or 0.01 A (1% by default).",
    "expression: an algebraic answer, checked for equivalence; variables: x, y when not every single letter is one.",
    "logic: a Boolean expression (A' for NOT, AB for AND, + for OR, ⊕, ⊙), right if it has the same truth table. With dontcare: 3, 7 (minterm numbers over variables: A, B, C, first most significant), those rows don't count.",
    "text: accepted words, “|” between alternatives. “>” lines explain the answer.",
    "Answers are recorded by the question's prompt; end the “?” line with {#name} to keep them through rewording.",
  ],
  render({ argument, body }, context) {
    const { questions, errors } = parseQuiz(body);
    if (errors.length > 0) return context.error(errors.join(" "));
    const resources = study(context);
    const ids = questions.map((question) =>
      questionId(resources.lesson, question.prompt, question.pin),
    );
    const repeated = ids.findIndex(
      (id, index) => resources.ids.has(id) || ids.indexOf(id) !== index,
    );
    if (repeated !== -1)
      return context.error(
        `Question ${String(repeated + 1)} has the same ID as another: change its prompt or give it its own {#name}.`,
      );
    for (const id of ids) resources.ids.add(id);
    const rendered: QuizQuestion[] = questions.map((question, index) => ({
      id: ids[index] ?? "",
      kind: question.kind,
      prompt: context.markdown(question.prompt),
      options: question.options.map((option) => context.inline(option.text)),
      optionLabels: question.options.map((option) =>
        option.text.includes("$") ? plainOption(option.text) : "",
      ),
      answer: answerHtml(question, context),
      explanation: question.explanation
        ? context.markdown(question.explanation)
        : "",
      check: checkData(question),
    }));
    const counters = study(context).counters;
    counters.set(
      "questions",
      (counters.get("questions") ?? 0) + rendered.length,
    );
    return island(context, {
      name: "quiz",
      props: {
        subject: resources.subject,
        lesson: resources.lesson,
        title: argument || "Check yourself",
        questions: rendered,
      },
    });
  },
};

const cards: BlockComponent = {
  kind: "block",
  name: "cards",
  set: STUDY_SET,
  summary:
    "Flashcards: a question on the front, the answer behind it. They join the subject's deck.",
  example: `::: cards
Unit of resistance? :: The ohm, Ω (欧姆)
Ohm's law :: $V = IR$
:::`,
  notes: [
    "One card per line: front :: back.",
    "A card's review history follows its front; end the line with {#name} to keep it through rewording.",
  ],
  render({ argument, body }, context) {
    const lines = body
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const bad = lines.find((line) => !line.includes("::"));
    if (bad) return context.error(`“${bad}” isn't a card (front :: back).`);
    const resources = study(context);
    const sources = lines.map((line) => {
      const split = line.indexOf("::");
      const { text: back, pin } = splitPin(line.slice(split + 2).trim());
      const front = line.slice(0, split).trim();
      return { front, back, id: cardId(resources.lesson, front, pin) };
    });
    const repeated = sources.find(
      (source) =>
        resources.ids.has(source.id) ||
        sources.filter((other) => other.id === source.id).length > 1,
    );
    if (repeated)
      return context.error(
        `Two cards share an ID (“${repeated.front}”): give one a different front or its own {#name}.`,
      );
    const items = sources.map((source) => {
      resources.ids.add(source.id);
      const card: CardEntry = {
        id: source.id,
        front: context.inline(source.front),
        back: context.inline(source.back),
      };
      context.emit("card", card);
      return `<li><details class="study-card"><summary>${card.front}</summary><div class="study-card-back">${card.back}</div></details></li>`;
    });
    return `<section class="study-cards" aria-label="${context.escape(argument || "Flashcards")}"><p class="study-cards-label">${context.escape(argument || "Flashcards")} <span>${String(items.length)} cards · open one to check yourself</span></p><ul>${items.join("")}</ul></section>\n`;
  },
};

const circuit: BlockComponent = {
  kind: "block",
  name: "circuit",
  set: STUDY_SET,
  summary: "A circuit diagram drawn from a grid description (GB/IEC symbols).",
  example: `::: circuit A voltage divider
V1 0,4 0,0 12V
R1 0,0 4,0 1k
R2 4,0 4,4 2k
W 0,4 4,4
G 0,4
label out 4,0
:::`,
  notes: [
    "Parts: R, C, L, V (from − to +), I (flows from the first point to the second), each between two grid points at least 2 apart, with a value (the unit may be left out).",
    "W x,y x,y … is a wire; G x,y ground; label a x,y names a node. Points that meet are joined.",
    "Drawn only: A (AC source), D, Z, S, E and F (controlled voltage and current sources, diamonds), and parts placed at one point: Q, M, U, T (transformer). study/README.md lists them all.",
  ],
  render({ argument, body }, context) {
    const { circuit: parsed, errors } = parseCircuit(body);
    if (errors.length > 0) return context.error(errors.join(" "));
    const loose = loosePins(parsed);
    if (loose.length > 0)
      return context.error(
        `Nothing is connected to ${loose.join(", ")}: check where the wires end (pins sit at fixed points around the device).`,
      );
    const number = nextNumber(context, "figure");
    const title = argument || "Circuit";
    const svg = drawCircuit(parsed, { title, id: context.id("circuit") });
    return `<figure class="study-figure" id="fig-${number.replace(/\./g, "-")}"><div class="study-figure-art">${svg}</div><figcaption><span class="study-box-kind">Figure ${number}</span> ${context.inline(title)}</figcaption></figure>\n`;
  },
};

function widget(
  name: "plot" | "explore" | "circuit",
  summary: string,
  exampleText: string,
  notes: string[],
  check: (body: string) => string[],
): BlockComponent {
  return {
    kind: "block",
    name: name === "circuit" ? "circuit-sim" : name,
    set: STUDY_SET,
    summary,
    example: exampleText,
    notes,
    render({ argument, body }, context) {
      const errors = check(body);
      if (errors.length > 0) return context.error(errors.join(" "));
      const number = nextNumber(context, "figure");
      return island(context, {
        name,
        props: {
          title: argument || "Try it",
          source: body,
          label: `Figure ${number}`,
        },
      });
    },
  };
}

const plot = widget(
  "plot",
  "A graph of functions, with sliders for their parameters and a crosshair that reads values off.",
  `::: plot Damped oscillation
x: 0 .. 10
xlabel: t (s)
f(t) = e^(-k t) cos(w t)
slider k: 0 .. 1 = 0.2
slider w: 0.5 .. 6 = 3 | rad/s
:::`,
  [
    "Curves: name(variable) = expression (up to 4). x: and y: set the ranges (y fits the curves when left out).",
    "slider name: low .. high = start | unit | log.",
  ],
  (body) => {
    const parsed = parsePlot(body);
    return parsed.ok ? [] : parsed.errors;
  },
);

const explore = widget(
  "explore",
  "A formula with sliders on its inputs and its results worked out as they move.",
  `::: explore Power in a resistor
slider V: 0 .. 12 = 5 | V
slider R: 1 .. 1k = 100 | Ω | log
I = V / R | A | Current
P = V I | W | Power
:::`,
  [
    "slider name: low .. high = start | unit | log.",
    "Results: name = expression | unit | label; later results can use earlier ones.",
  ],
  (body) => {
    const parsed = parseExplore(body);
    return parsed.ok ? [] : parsed.errors;
  },
);

const circuitSim = widget(
  "circuit",
  "A circuit you can change: sliders on its parts, with every node's voltage and every part's current and power worked out (DC).",
  `::: circuit-sim A voltage divider
V1 0,4 0,0 12V [0..24]
R1 0,0 4,0 1k
R2 4,0 4,4 2k
W 0,4 4,4
G 0,4
:::`,
  [
    "Written like ::: circuit. Each part gets a slider: [low..high] after its value sets the range.",
  ],
  (body) => {
    const { circuit: parsed, errors } = parseCircuit(body);
    const problem = errors.length === 0 ? simulationProblem(parsed) : null;
    return problem ? [problem] : errors;
  },
);

const term: InlineComponent = {
  kind: "inline",
  name: "term",
  set: STUDY_SET,
  summary: "A technical term with its Chinese name, added to the glossary.",
  example: "A {{term node | 节点}} is where two or more parts meet.",
  notes: ["{{term English | 中文}}"],
  render(argument, context) {
    const [english, zh] = splitBilingual(argument);
    if (!english) return context.error("{{term English | 中文}}");
    context.emit("glossary", {
      term: english,
      zh,
      definition: null,
      anchor: null,
    } satisfies GlossaryEntry);
    return `<span class="study-term"><span class="study-term-en">${context.inline(english)}</span>${chinese(zh, context, "study-term-zh")}</span>`;
  },
};

const zh: InlineComponent = {
  kind: "inline",
  name: "zh",
  set: STUDY_SET,
  summary:
    "Chinese text, marked as Chinese (for the right font and pronunciation).",
  example: "The exam calls it {{zh 戴维南定理}}.",
  render(argument, context) {
    return chinese(argument.trim(), context);
  },
};

export const STUDY_COMPONENTS = [
  callout,
  define,
  theorem,
  law,
  formula,
  example,
  quiz,
  cards,
  circuit,
  circuitSim,
  plot,
  explore,
  term,
  zh,
  ...LOGIC_COMPONENTS,
  ...SET_COMPONENTS,
  ...THERMO_COMPONENTS,
] as const;
