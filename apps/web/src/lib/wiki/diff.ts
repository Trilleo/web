/**
 * Comparing two revisions line by line (a longest common subsequence after the
 * common start and end are set aside). Pages are short enough for that; a change
 * too big to compare in DIFF_CELLS steps shows as everything removed and added.
 */

export type DiffLine =
  | { op: "same"; text: string; oldLine: number; newLine: number }
  | { op: "removed"; text: string; oldLine: number }
  | { op: "added"; text: string; newLine: number };

export const DIFF_CELLS = 4_000_000;

function lines(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  if (normalized === "") return [];
  return normalized.replace(/\n$/, "").split("\n");
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = lines(before);
  const b = lines(after);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start])
    start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const out: DiffLine[] = [];
  for (let i = 0; i < start; i += 1)
    out.push({ op: "same", text: a[i] ?? "", oldLine: i + 1, newLine: i + 1 });

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;
  if (n * m > DIFF_CELLS) {
    midA.forEach((text, i) =>
      out.push({ op: "removed", text, oldLine: start + i + 1 }),
    );
    midB.forEach((text, j) =>
      out.push({ op: "added", text, newLine: start + j + 1 }),
    );
  } else {
    // lcs[i][j]: the common subsequence's length of midA[i..] and midB[j..].
    const width = m + 1;
    const lcs = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        lcs[i * width + j] =
          midA[i] === midB[j]
            ? (lcs[(i + 1) * width + j + 1] ?? 0) + 1
            : Math.max(
                lcs[(i + 1) * width + j] ?? 0,
                lcs[i * width + j + 1] ?? 0,
              );
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) {
        out.push({
          op: "same",
          text: midA[i] ?? "",
          oldLine: start + i + 1,
          newLine: start + j + 1,
        });
        i += 1;
        j += 1;
      } else if (
        j < m &&
        (i >= n ||
          (lcs[i * width + j + 1] ?? 0) >= (lcs[(i + 1) * width + j] ?? 0))
      ) {
        out.push({ op: "added", text: midB[j] ?? "", newLine: start + j + 1 });
        j += 1;
      } else {
        out.push({
          op: "removed",
          text: midA[i] ?? "",
          oldLine: start + i + 1,
        });
        i += 1;
      }
    }
  }

  const shift = endB - endA;
  for (let i = endA; i < a.length; i += 1)
    out.push({
      op: "same",
      text: a[i] ?? "",
      oldLine: i + 1,
      newLine: i + shift + 1,
    });
  return out;
}

/** A diff with long unchanged runs folded, keeping `context` lines around changes. */
export type DiffHunkLine = DiffLine | { op: "skip"; count: number };

export function foldDiff(diff: DiffLine[], context = 3): DiffHunkLine[] {
  const keep = new Array<boolean>(diff.length).fill(false);
  diff.forEach((line, index) => {
    if (line.op === "same") return;
    for (
      let k = Math.max(0, index - context);
      k <= Math.min(diff.length - 1, index + context);
      k += 1
    )
      keep[k] = true;
  });
  const out: DiffHunkLine[] = [];
  let skipped = 0;
  diff.forEach((line, index) => {
    if (keep[index]) {
      if (skipped > 0) out.push({ op: "skip", count: skipped });
      skipped = 0;
      out.push(line);
    } else {
      skipped += 1;
    }
  });
  if (skipped > 0) out.push({ op: "skip", count: skipped });
  return out;
}

/** Lines added and removed. */
export function diffStats(diff: DiffLine[]): {
  added: number;
  removed: number;
} {
  let added = 0;
  let removed = 0;
  for (const line of diff) {
    if (line.op === "added") added += 1;
    if (line.op === "removed") removed += 1;
  }
  return { added, removed };
}
