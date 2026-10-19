import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";
import { lessonsOf, loadSubjects } from "./content";
import { createRenderer, mergeGlossary, splitIslands } from "./render";

const renderer = createRenderer({
  figure: (path) =>
    path === "figures/known.webp" ? "/_astro/known.webp" : null,
});
const render = (body: string) =>
  renderer.render({
    subject: "circuits",
    slug: "kcl",
    number: "2.3",
    title: "Lesson",
    body,
  });

describe("lessons", () => {
  test("number their headings like a textbook", () => {
    const { html, toc } = render(
      "# First\n\n## Second\n\n### Inside\n\n## Third",
    );
    expect(toc.map((heading) => `${heading.number} ${heading.text}`)).toEqual([
      "2.3.1 First",
      "2.3.2 Second",
      "2.3.2.1 Inside",
      "2.3.3 Third",
    ]);
    expect(html).toContain(
      '<h2 id="first"><span class="study-secnum">2.3.1</span> First</h2>',
    );
    expect(html).not.toContain("data-number");
  });

  test("render maths with KaTeX, and leave prices alone", () => {
    const { html, errors } = render(
      "Inline $x^2$ and $$\\frac{a}{b}$$ costs $5 and $10.\n\n$$\nE = mc^2\n$$\n\n$\\ce{H2O}$",
    );
    expect(errors).toEqual([]);
    expect(html).toContain('<span class="katex">');
    expect(html).toContain(
      '<div class="study-math"><span class="katex-display">',
    );
    expect(html).toContain("costs $5 and $10.");
    expect(html.match(/class="katex"/g)?.length).toBe(4);
  });

  test("report maths KaTeX can't read", () => {
    const { html, errors } = render("Broken $\\frac{1}$ here.");
    expect(errors).toHaveLength(1);
    expect(html).toContain("study-math-error");
  });

  test("number boxes and collect the glossary and formulas", () => {
    const result = render(`::: define Resistance | 电阻
Opposition to current.
:::

{{term node | 节点}}

::: formula Ohm's law | 欧姆定律
$$u = Ri$$
--
u | voltage | V
:::

::: example Second example?
Problem.
== Step ==
Do it.
:::`);
    expect(result.errors).toEqual([]);
    expect(result.html).toContain("Definition 2.3.1");
    expect(result.html).toContain('lang="zh-CN"');
    expect(result.html).toContain("Formula (2.3.1)");
    expect(result.html).toContain("Example 2.3.1");
    expect(result.html).toContain('<details class="study-step">');
    expect(
      result.glossary.map((entry) => [entry.term, entry.zh, entry.anchor]),
    ).toEqual([
      ["Resistance", "电阻", "def-resistance"],
      ["node", "节点", null],
    ]);
    expect(result.formulas[0]).toMatchObject({
      name: "Ohm's law",
      zh: "欧姆定律",
      number: "2.3.1",
      anchor: "eq-2-3-1",
    });
  });

  test("leave placeholders for widgets", () => {
    const result = render(`Before.

::: quiz
? What's 1 + 1?
answer: 2
:::

Between.

::: plot
f(x) = x^2
:::`);
    expect(result.errors).toEqual([]);
    expect(result.islands.map((entry) => entry.name)).toEqual(["quiz", "plot"]);
    expect(result.questions).toBe(1);
    const parts = splitIslands(result.html, result.islands);
    expect(parts.map((part) => part.kind)).toEqual([
      "html",
      "island",
      "html",
      "island",
    ]);
    const quiz = result.islands[0];
    expect(quiz?.name === "quiz" && quiz.props.questions[0]?.check.answer).toBe(
      "2",
    );
  });

  test("show mistakes in components as errors", () => {
    const result = render(
      "::: quiz\n? No answer\n:::\n\n::: circuit\nR1 0,0 1,1 1k\n:::\n\n::: nothing\n:::\n\n![x](figures/missing.webp)",
    );
    expect(result.errors).toHaveLength(4);
  });

  test("give cards and questions stable IDs, pinned or from their text", () => {
    const result = render(`::: cards
Front :: Back
Pinned front :: Back {#pinned}
:::

::: quiz
? One?
answer: 1

? Two? {#two}
answer: 2
:::`);
    expect(result.errors).toEqual([]);
    const [plain, pinned] = result.cards;
    expect(plain?.id).toMatch(/^c:kcl:[0-9a-z]{7}$/);
    expect(pinned).toMatchObject({ id: "c:kcl:pinned", back: "Back" });
    const quiz = result.islands[0];
    if (quiz?.name !== "quiz") throw new Error("no quiz");
    expect(quiz.props).toMatchObject({ subject: "circuits", lesson: "kcl" });
    expect(quiz.props.questions.map((question) => question.id)).toEqual([
      expect.stringMatching(/^q:kcl:[0-9a-z]{7}$/),
      "q:kcl:two",
    ]);
    // The same text gives the same ID on every build; a change gives a new one.
    expect(render("::: cards\nFront :: Other back\n:::").cards[0]?.id).toBe(
      plain?.id,
    );
    expect(render("::: cards\nFront! :: Back\n:::").cards[0]?.id).not.toBe(
      plain?.id,
    );
  });

  test("name maths-only options in plain text", () => {
    const quiz = render(
      "::: quiz\n? Pick\n- [x] $u_{ab} = -u_{ba}$\n- [ ] **Never**\n:::",
    ).islands[0];
    if (quiz?.name !== "quiz") throw new Error("no quiz");
    expect(quiz.props.questions[0]?.optionLabels).toEqual([
      "u_{ab} = -u_{ba}",
      "",
    ]);
  });

  test("refuse two cards or questions with one ID", () => {
    expect(render("::: cards\nA :: 1\nA :: 2\n:::").errors).toHaveLength(1);
    expect(
      render("::: quiz\n? A {#x}\nanswer: 1\n\n? B {#x}\nanswer: 2\n:::")
        .errors,
    ).toHaveLength(1);
  });

  test("draw Karnaugh maps, checking their groups", () => {
    const good = render(
      "::: kmap Y\nvars: A B C D\nones: 0 2 5 7 8 10 13 15\ngroup: B D\ngroup: B' D'\n:::",
    );
    expect(good.errors).toEqual([]);
    expect(good.html).toContain("study-kmap");
    expect(good.html.match(/data-value="1"/g)).toHaveLength(8);
    expect(
      render("::: kmap\nvars: A B\nexpression: A B'\n:::").html.match(
        /data-value="1"/g,
      ),
    ).toHaveLength(1);
    // A group that covers a 0, or leaves a 1 out.
    expect(
      render("::: kmap\nvars: A B\nones: 3\ngroup: A\n:::").errors,
    ).toHaveLength(1);
    expect(
      render("::: kmap\nvars: A B\nones: 1 3\ngroup: A B\n:::").errors,
    ).toHaveLength(1);
    expect(render("::: kmap\nvars: A\nones: 1\n:::").errors).toHaveLength(1);
  });

  test("draw gate symbols and leave a logic lab", () => {
    const gates = render("::: gates\nand nor xnor\n:::");
    expect(gates.errors).toEqual([]);
    expect(gates.html.match(/class="study-gate"/g)).toHaveLength(6);
    expect(render("::: gates\nmaybe\n:::").errors).toHaveLength(1);
    const lab = render("::: logic XOR\nY = A B' + A' B\n:::");
    expect(lab.errors).toEqual([]);
    const island = lab.islands[0];
    expect(island?.name === "logic" && island.props.inputs).toEqual(["A", "B"]);
    expect(render("::: logic\ninputs: A\nY = A B\n:::").errors).toHaveLength(1);
  });

  test("draw Venn diagrams, one panel per shaded event", () => {
    const venn = render(
      "::: venn De Morgan\nshade: (A ∪ B)'\nshade: A'B'\n:::",
    );
    expect(venn.errors).toEqual([]);
    expect(venn.html.match(/class="study-venn-panel"/g)).toHaveLength(2);
    // Outside both circles: one cell, so one mask each.
    expect(venn.html.match(/<mask /g)).toHaveLength(2);
    expect(venn.html).toContain("outside A and B");
    const three = render("::: venn\nsets: A B C\nshade: A - B\n:::");
    expect(three.html.match(/<mask /g)).toHaveLength(2);
    expect(render("::: venn\nshade: A +\n:::").errors).toHaveLength(1);
    expect(render("::: venn\nsets: A\nshade: B\n:::").errors).toHaveLength(1);
    expect(render("::: venn\nshade: A B C D\n:::").errors).toHaveLength(1);
  });

  test("draw p–V diagrams from the processes' equations", () => {
    const carnot = render(`::: pv Carnot
gamma: 1.4
1: V 10, p 400
2: V 20, p 200
3: V 40, p 75.8
4: V 20, p 151.6
1 -> 2: isothermal
2 -> 3: adiabatic
3 -> 4: isothermal
4 -> 1: adiabatic
1 -> 3: line dashed
shade: cycle
:::`);
    expect(carnot.errors).toEqual([]);
    expect(carnot.html).toMatch(/Figure [\d.]+<\/span> Carnot/);
    expect(carnot.html.match(/class="pv-arrow"/g)).toHaveLength(4);
    expect(carnot.html.match(/class="pv-shade /g)).toHaveLength(1);
    expect(carnot.html).toContain("2 → 3 adiabatic");
    expect(carnot.html).toContain("1 → 3 straight line (dashed reference)");
    expect(
      render(
        "::: pv\n1: V 1, p 2\n2: V 2, p 2\n1 -> 2: isobaric\nshade: 1 -> 2\n:::",
      ).errors,
    ).toEqual([]);
    // States that don't fit the process, an open "cycle", unknown names.
    const errors = (body: string) => render(`::: pv\n${body}\n:::`).errors;
    expect(errors("1: V 1, p 4\n2: V 2, p 3\n1 -> 2: isothermal")[0]).toMatch(
      /isothermal: pV is 4 at 1 but 6 at 2/,
    );
    expect(
      errors("1: V 1, p 4\n2: V 2, p 4\n1 -> 2: line\nshade: cycle"),
    ).toHaveLength(1);
    expect(errors("1: V 1, p 4\n1 -> 2: line")).toHaveLength(1);
    expect(errors("1: V 1")).toHaveLength(1);
    expect(errors("1: V 1, p 1\n2: V 1, p 3\n1 -> 2: isochoric")).toEqual([]);
    expect(
      errors("axes: S, T\n1: S 1, T 4\n2: S 2, T 4\n1 -> 2: isothermal"),
    ).toHaveLength(1);
    expect(
      errors("axes: S, T\n1: S 1, T 4\n2: S 2, T 4\n1 -> 2: line"),
    ).toEqual([]);
  });

  test("plot bars and regions", () => {
    const plot = render(
      "::: plot Binomial\nx: 0 .. 10\nbars P(k) = comb(n, k) p^k (1 - p)^(n - k)\nslider n: 1 .. 10 = 10 | | step 1\nslider p: 0 .. 1 = 0.3\n:::",
    );
    expect(plot.errors).toEqual([]);
    expect(
      render("::: plot G\ny: 0 .. 1\nregion G: 0 < y < x < 1, x + y <= 1\n:::")
        .errors,
    ).toEqual([]);
    expect(render("::: plot G\nregion G: 0 < y < x\n:::").errors).toHaveLength(
      1,
    );
    expect(
      render("::: plot G\ny: 0 .. 1\nregion: x + y\n:::").errors,
    ).toHaveLength(1);
    expect(
      render("::: plot\nf(x) = x\nslider n: 1 .. 5 = 2 | | step 0\n:::").errors,
    ).toHaveLength(1);
    const labelled = render(
      "::: explore Bayes\nslider p: 0 .. 1 = 0.8 | | prior trust\nslider n: 1 .. 5 = 2 | | step 1 | lies told\nq = p\n:::",
    );
    expect(labelled.errors).toEqual([]);
    const island = labelled.islands[0];
    expect(island?.name === "explore" && island.props.source).toContain(
      "prior trust",
    );
    expect(
      render("::: explore\nslider p: 0 .. 1 | | one | two\nq = p\n:::").errors,
    ).toHaveLength(1);
  });

  test("resolve figures", () => {
    expect(render("![A bridge](figures/known.webp)").html).toContain(
      'src="/_astro/known.webp"',
    );
  });

  test("keep HTML as text", () => {
    expect(render("<script>alert(1)</script>").html).not.toContain("<script>");
  });
});

test("mergeGlossary keeps one entry per term, preferring definitions", () => {
  const lesson = { lesson: "a", lessonTitle: "A", lessonNumber: "1.1" };
  const merged = mergeGlossary([
    { term: "Node", zh: null, definition: null, anchor: null, ...lesson },
    {
      term: "node",
      zh: "节点",
      definition: "<p>Where parts meet.</p>",
      anchor: "def-node",
      ...lesson,
    },
    { term: "Loop", zh: "回路", definition: null, anchor: null, ...lesson },
  ]);
  expect(
    merged.map((entry) => [entry.term, entry.zh, Boolean(entry.definition)]),
  ).toEqual([
    ["Loop", "回路", false],
    ["node", "节点", true],
  ]);
});

/** The repository's own study/ folder: every subject loads and every lesson renders cleanly. */
describe("study/ content", () => {
  const root = new URL("../../../study/", import.meta.url).pathname;
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith(".md") && relative(root, path) !== "README.md")
        files[relative(root, path)] = readFileSync(path, "utf8");
    }
  };
  walk(root);
  const subjects = loadSubjects(files, { drafts: true });
  const figures = new Set(
    Object.keys(files).length
      ? subjects.flatMap((subject) => {
          try {
            return readdirSync(join(root, subject.slug, "figures")).map(
              (name) => `${subject.slug}/figures/${name}`,
            );
          } catch {
            return [];
          }
        })
      : [],
  );

  for (const subject of subjects)
    for (const lesson of lessonsOf(subject))
      test(`${subject.slug}/${lesson.slug} renders without errors`, () => {
        const lessonRenderer = createRenderer({
          figure: (path) =>
            figures.has(`${subject.slug}/${path}`) ? `/${path}` : null,
        });
        const result = lessonRenderer.render({
          subject: subject.slug,
          slug: lesson.slug,
          number: lesson.number,
          title: lesson.title,
          body: lesson.body,
        });
        expect(result.errors).toEqual([]);
      });
});
