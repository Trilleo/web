# Study subjects

Each folder here is a subject on <https://www.trilleo.net/study/>, built into static
pages by `@trilleo/study` (packages/study) and apps/web. Subjects come from class
materials (Rain Classroom), shared with the teachers' permission. `sample/` is a draft
that uses every block: copy from it.

## Files

```
study/<subject>/subject.md                    the subject: front matter + an introduction
study/<subject>/<NN>-<unit>/unit.md           a unit (chapter): front matter only
study/<subject>/<NN>-<unit>/<NN>-<lesson>.md  a lesson
study/<subject>/figures/<file>                pictures (webp, png, jpg, gif, avif, svg)
```

Numbers order and number things (`02-network-analysis/03-thevenin.md` is lesson 2.3);
the rest of the name is the slug (`/study/<subject>/thevenin/`). Lesson slugs are unique
within a subject and can't be `glossary`, `formulas`, `review`, `practice`, `mistakes`,
`units` or `figures`.

## Front matter

`subject.md`: `title`, `summary` (required), `zh` (Chinese name), `teacher`, `course`
(code or class), `term`, `source` ("Rain Classroom"), `order` (a number; lower first),
`draft: true` (development and tests only), and `exams` as a list:

```yaml
exams:
  - 2027-01-12 | Final exam
```

`unit.md`: `title` (required), `zh`, `summary`. A lesson: `title`, `summary`
(required), `zh`, `source` (the lecture it's from). Unknown fields are mistakes.

## Writing lessons

Markdown (no HTML), with `##` sections (numbered 2.3.1, 2.3.2; `###` 2.3.1.1).
Maths is KaTeX: `$u = Ri$` inline, `$$ … $$` on lines of their own for display, `\ce{}`
for chemistry. Shorthands: `\d` (upright d), `\j`, `\R`, `\unit{kΩ}`, `\phasor{U}`.
Pictures: `![What it shows](figures/bridge.webp)`. Keep them few and small (WebP): they
ship in the site's image. Prefer drawing circuits and graphs with the blocks below.

Inline: `{{term English | 中文}}` (a term, added to the glossary), `{{zh 中文}}`.

Blocks (`::: name argument` … `:::`):

| Block                           | What it is                                                           |
| ------------------------------- | -------------------------------------------------------------------- |
| `::: define Term \| 中文`       | Numbered definition; goes in the glossary                            |
| `::: law Name \| 中文`          | Numbered law (also `::: theorem`)                                    |
| `::: formula Name \| 中文`      | Numbered equation, then `--` and `symbol \| meaning \| unit` lines   |
| `::: example Title`             | Worked example: the problem, then `== Step ==` sections, closed      |
| `::: callout kind Title`        | note, tip, key, pitfall, warning, summary, exam                      |
| `::: quiz Title`                | Questions checked as you answer (below)                              |
| `::: cards Title`               | Flashcards, one per line: `front :: back`                            |
| `::: circuit Title`             | A schematic drawn from a grid description (below)                    |
| `::: circuit-sim Title`         | The same, with a slider per part and live DC readings                |
| `::: plot Title`                | Curves with sliders: `f(x) = …`, `x: 0 .. 10`, `slider a: 0 .. 3 = 1` |
| `::: explore Title`             | Sliders and results: `slider V: 0 .. 12 = 5 \| V`, `P = V I \| W \| Power` |

Quizzes: `?` starts a question; then options (`- [x]` right, `- [ ]` wrong), or
`answer: 0.5 A` (a number with its unit; `tolerance: 2%`, 1% by default), or
`expression: u^2/R` (checked for equivalence; `variables: u, R`), or `text: farad | F`.
`>` lines explain the answer. Write an explanation for every question.

Circuits: parts between grid points, at least 2 apart: `R1 0,0 4,0 1k`, `C1 …`,
`L1 …`, `V1 0,4 0,0 12V` (from − to +), `I1 0,4 0,0 3mA` (flowing first → second);
`W 0,4 4,4 8,4` wires (a point on a wire joins it), `G 0,4` ground, `label out 4,0`.
In `circuit-sim`, `[low..high]` after a value sets its slider's range.

Every block is documented with an example in `packages/study/src/components/blocks.ts`.

## Checking

`pnpm --filter @trilleo/study test` renders every lesson here and fails on any problem
(bad maths, a quiz without an answer, a circuit that doesn't parse). `pnpm dev` shows
drafts at <http://localhost:4321/study/>. Prettier leaves these files alone.
