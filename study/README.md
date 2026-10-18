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
| `::: logic Title`               | A logic lab: `inputs: A B`, `Y = A B' + A' B` (switches, lamps, truth table) |
| `::: kmap Y`                    | A Karnaugh map: `vars: A B C D`, `ones: 0 2 5`, `dont-care: 1`, `group: B D'` |
| `::: gates`                     | Gate symbols (both shapes), expressions, truth tables: `and or not xor` |

Quizzes: `?` starts a question; then options (`- [x]` right, `- [ ]` wrong), or
`answer: 0.5 A` (a number with its unit; `tolerance: 2%`, 1% by default), or
`expression: u^2/R` (checked for equivalence; `variables: u, R`), `logic: A ⊕ B`
(a Boolean expression, right when its truth table matches: `A'B + AB'` passes), or
`text: farad | F`.
`>` lines explain the answer. Write an explanation for every question.

Review history follows each card's front and each question's prompt: change the
text and it starts fresh. To reword one and keep its history, give it a name first:
end the card's line, or the question's `?` line, with `{#name}` (lower-case letters,
digits and hyphens, unique in the lesson).

Circuits: parts between grid points, at least 2 apart: `R1 0,0 4,0 1k`, `C1 …`,
`L1 …`, `V1 0,4 0,0 12V` (from − to +), `I1 0,4 0,0 3mA` (flowing first → second),
`A1 0,4 0,0 u2` (AC source), `D1 0,0 4,0 1N4007` (diode, anode first), `Z1 4,4 4,0 6V`
(Zener, anode first), `S1 0,0 2,0 closed` (switch). A symbol instead of a value
(`R2 4,0 4,4 Rc`, `R3 0,0 4,0 R/2`, `C2 … 2C`) labels a part in a drawing; one that
repeats the name (`R1 … R1`) is drawn once. Transistors and op-amps sit at one point
with pins around it: `Q1 npn 2,2` (base 2,2, collector 4,0, emitter 4,4; `pnp`, add
`left` to face left, `flip` to swap collector and emitter, then any text such as
`β=50`), `M1 nmos 2,2` (gate, drain 4,0, source 4,4; `pmos`, `nmos-d`, `pmos-d`,
`njfet`, `pjfet`), `U1 opamp 2,2` (− at 2,1, + at 2,3, output 6,2; `plus-top`).
`W 0,4 4,4 8,4` wires (a point on a wire joins it), `G 0,4` ground, `label +VCC 4,0`.
A transistor or op-amp with some pins wired and one left loose is a render error (a
wire that stops a square short); one with no pins wired is a symbol on show.
`circuit-sim` takes only R, C, L, V, I and switches, with numeric values; `[low..high]`
after a value sets its slider's range.

Logic expressions (`::: logic`, `::: kmap`): variables are one letter, optionally with
digits (A, D0); NOT `A'` or `!A`, AND by writing side by side (`AB`) or `·`, OR `+`, XOR
`⊕`, XNOR `⊙`. In a Karnaugh map each `group:` is the product term it stands for; the
map checks it covers only 1s and ×s, and that every 1 is covered.

Every block is documented with an example in `packages/study/src/components/blocks.ts`.

## Checking

`pnpm --filter @trilleo/study test` renders every lesson here and fails on any problem
(bad maths, a quiz without an answer, a circuit that doesn't parse). `pnpm dev` shows
drafts at <http://localhost:4321/study/>. Prettier leaves these files alone.
