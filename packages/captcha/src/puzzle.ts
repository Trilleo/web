/**
 * The puzzle: a 4×4 grid of simple shapes drawn a little differently each time,
 * "Select every square with a ring". It's plain HTML (a checkbox per cell), so it
 * works without JavaScript and from the keyboard. For those who can't see it, a
 * question in words does the same job.
 *
 * Neither would stop a bot written for this site; they're for the generic ones,
 * and every failure makes the next check harder (levels.ts).
 */

export const PUZZLE_SIZE = 4;
export const PUZZLE_CELLS = PUZZLE_SIZE * PUZZLE_SIZE;

export const SHAPES = [
  "ring",
  "square",
  "triangle",
  "cross",
  "diamond",
] as const;
export type Shape = (typeof SHAPES)[number];

/** A shape as drawn in one cell (40×40). */
export interface Cell {
  shape: Shape;
  filled: boolean;
  /** Centre and size, jittered. */
  x: number;
  y: number;
  size: number;
  /** A faint stroke across the cell, from (x1, y1) to (x2, y2). */
  noise: readonly [number, number, number, number];
}

export interface Puzzle {
  target: Shape;
  cells: readonly Cell[];
  /** The cells with the target, ascending. */
  answer: readonly number[];
  /** The question in words, and its answer (lower case). */
  question: string;
  textAnswer: string;
}

type Random = () => number;

function pick<T>(items: readonly T[], random: Random): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error("Nothing to pick from.");
  return item;
}

function shuffle<T>(items: T[], random: Random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
] as const;

const COLOURS = ["orange", "green", "blue", "yellow", "purple"] as const;
const THINGS = [
  "table",
  "window",
  "pencil",
  "garden",
  "ladder",
  "bottle",
] as const;

/** A short question in words, with its answer. */
function wordQuestion(random: Random): { question: string; answer: string } {
  if (random() < 0.5) {
    const a = 2 + Math.floor(random() * 8);
    const b = 1 + Math.floor(random() * 9);
    return {
      question: `What is ${NUMBER_WORDS[a] ?? ""} plus ${NUMBER_WORDS[b] ?? ""}? Answer in digits.`,
      answer: String(a + b),
    };
  }
  const colour = pick(COLOURS, random);
  const words = shuffle(
    [colour, ...shuffle([...THINGS], random).slice(0, 3)],
    random,
  );
  return {
    question: `Which of these words is a colour: ${words.join(", ")}?`,
    answer: colour,
  };
}

/** A new puzzle: 3 to 6 cells hold the target shape, the rest others. */
export function makePuzzle(random: Random): Puzzle {
  const target = pick(SHAPES, random);
  const others = SHAPES.filter((shape) => shape !== target);
  const count = 3 + Math.floor(random() * 4);
  const places = shuffle(
    Array.from({ length: PUZZLE_CELLS }, (_, i) => i),
    random,
  )
    .slice(0, count)
    .sort((a, b) => a - b);
  const cells = Array.from({ length: PUZZLE_CELLS }, (_, i): Cell => {
    const jitter = () => (random() - 0.5) * 6;
    return {
      shape: places.includes(i) ? target : pick(others, random),
      filled: random() < 0.4,
      x: 20 + jitter(),
      y: 20 + jitter(),
      size: 9 + random() * 5,
      noise: [
        random() * 40,
        random() * 40,
        random() * 40,
        random() * 40,
      ] as const,
    };
  });
  const words = wordQuestion(random);
  return {
    target,
    cells,
    answer: places,
    question: words.question,
    textAnswer: words.answer,
  };
}

/** The answer as one string: cell numbers, ascending, comma-separated. */
export function answerKey(cells: readonly number[]): string {
  return [...new Set(cells)]
    .filter(
      (cell) => Number.isInteger(cell) && cell >= 0 && cell < PUZZLE_CELLS,
    )
    .sort((a, b) => a - b)
    .join(",");
}

/** How a typed answer is compared: lower case, letters and digits only. */
export function normalizeTextAnswer(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const round = (n: number) => Math.round(n * 10) / 10;

/** The shape's outline as a path (everything is a path, so no tag gives it away). */
function outline(cell: Cell): string {
  const { x, y, size: r } = cell;
  const p = (dx: number, dy: number) =>
    `${String(round(x + dx))} ${String(round(y + dy))}`;
  switch (cell.shape) {
    case "ring":
      return `M${p(-r, 0)}A${String(round(r))} ${String(round(r))} 0 1 0 ${p(r, 0)}A${String(round(r))} ${String(round(r))} 0 1 0 ${p(-r, 0)}Z`;
    case "square":
      return `M${p(-r, -r)}L${p(r, -r)}L${p(r, r)}L${p(-r, r)}Z`;
    case "diamond":
      return `M${p(0, -r * 1.3)}L${p(r * 1.3, 0)}L${p(0, r * 1.3)}L${p(-r * 1.3, 0)}Z`;
    case "triangle":
      return `M${p(0, -r * 1.2)}L${p(r * 1.2, r)}L${p(-r * 1.2, r)}Z`;
    case "cross": {
      const t = r / 3;
      return `M${p(-t, -r)}L${p(t, -r)}L${p(t, -t)}L${p(r, -t)}L${p(r, t)}L${p(t, t)}L${p(t, r)}L${p(-t, r)}L${p(-t, t)}L${p(-r, t)}L${p(-r, -t)}L${p(-t, -t)}Z`;
    }
  }
}

/** One cell's SVG, drawn in currentColor so it follows the theme. */
export function cellSvg(cell: Cell): string {
  const [x1, y1, x2, y2] = cell.noise;
  return (
    `<svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true" focusable="false">` +
    `<path d="M${String(round(x1))} ${String(round(y1))}L${String(round(x2))} ${String(round(y2))}" stroke="currentColor" stroke-width="0.6" opacity="0.35"/>` +
    `<path d="${outline(cell)}" fill="${cell.filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>` +
    `</svg>`
  );
}
