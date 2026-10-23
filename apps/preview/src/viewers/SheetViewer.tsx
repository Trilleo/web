/**
 * Spreadsheets through SheetJS: Excel (.xlsx, .xlsm, .xlsb, .xls), OpenDocument
 * (.ods) and CSV/TSV. Each sheet as a table of the values as they're displayed
 * (formatted numbers and dates; formulas show their last result), with tabs for
 * sheets and rows shown in pages.
 */
import { useEffect, useMemo, useState } from "react";
import { Notice, count, toolButton, type ViewerProps } from "./common";

type XLSX = typeof import("xlsx");

/** Rows read from each sheet; more say so. */
export const MAX_ROWS = 10_000;
/** Columns shown. */
export const MAX_COLUMNS = 200;
/** Rows shown before "Show more". */
const PAGE_ROWS = 500;

interface Sheet {
  name: string;
  rows: string[][];
  columns: number;
  truncated: boolean;
  hidden: boolean;
}

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function readSheets(xlsx: XLSX, bytes: Uint8Array): Sheet[] {
  const book = xlsx.read(bytes, {
    type: "array",
    dense: true,
    cellDates: true,
    cellFormula: false,
    cellHTML: false,
    sheetRows: MAX_ROWS + 1,
  });
  return book.SheetNames.map((name, index) => {
    const sheet = book.Sheets[name];
    const rows = sheet
      ? xlsx.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          raw: false,
          defval: "",
          blankrows: true,
        })
      : [];
    const truncated = rows.length > MAX_ROWS;
    const kept = rows
      .slice(0, MAX_ROWS)
      .map((row) => row.slice(0, MAX_COLUMNS));
    // Trailing empty rows are only formatting.
    while (kept.length > 0 && kept[kept.length - 1]?.every((cell) => !cell))
      kept.pop();
    return {
      name,
      rows: kept,
      columns: Math.max(0, ...kept.map((row) => row.length)),
      truncated,
      hidden: Boolean(book.Workbook?.Sheets?.[index]?.Hidden),
    };
  });
}

export default function SheetViewer({ doc, onFacts }: ViewerProps) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(PAGE_ROWS);

  useEffect(() => {
    const controller = new AbortController();
    // A call, not a property: TypeScript would otherwise keep its first answer.
    const stale = () => controller.signal.aborted;
    void (async () => {
      try {
        const xlsx = await import("xlsx");
        const read = readSheets(xlsx, doc.bytes);
        if (stale()) return;
        setSheets(read);
        onFacts([
          ["Sheets", count(read.length)],
          [
            "Rows",
            read
              .map(
                (sheet) =>
                  `${sheet.name}: ${count(sheet.rows.length)}${sheet.truncated ? "+" : ""}`,
              )
              .join(", "),
          ],
        ]);
      } catch {
        if (!stale()) setFailed(true);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [doc, onFacts]);

  const sheet = sheets?.[active];
  const columns = useMemo(
    () => Array.from({ length: sheet?.columns ?? 0 }, (_, i) => columnName(i)),
    [sheet],
  );

  if (failed)
    return (
      <Notice role="alert">
        This spreadsheet couldn't be read. It may be damaged or protected with a
        password.
      </Notice>
    );
  if (!sheets || !sheet) return <p role="status">Reading the sheets…</p>;

  return (
    <div className="flex flex-col gap-4">
      {sheets.length > 1 && (
        <div
          role="tablist"
          aria-label="Sheets"
          className="flex flex-wrap gap-2"
        >
          {sheets.map((each, index) => (
            <button
              key={`${each.name}-${String(index)}`}
              type="button"
              role="tab"
              aria-selected={index === active}
              className={`${toolButton} ${index === active ? "bg-ink text-paper" : ""}`}
              onClick={() => {
                setActive(index);
                setShown(PAGE_ROWS);
              }}
            >
              {each.name}
              {each.hidden && <span className="sr-only"> (hidden)</span>}
              {each.hidden && <span aria-hidden="true"> ·</span>}
            </button>
          ))}
        </div>
      )}
      {sheet.rows.length === 0 ? (
        <p>This sheet is empty.</p>
      ) : (
        <div
          className="max-h-[70vh] overflow-auto border border-hair"
          // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- it scrolls both ways, and a scrollable region must be reachable by keyboard
          tabIndex={0}
          role="region"
          aria-label={`Sheet ${sheet.name}`}
        >
          <table className="border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-chip">
              <tr>
                <th scope="col" className="sticky left-0 bg-chip px-2 py-1">
                  <span className="sr-only">Row</span>
                </th>
                {columns.map((name) => (
                  <th
                    key={name}
                    scope="col"
                    className="border-l border-hair px-2 py-1 font-mono text-xs font-normal text-muted"
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.rows.slice(0, shown).map((row, r) => (
                <tr key={r} className="border-t border-hair">
                  <th
                    scope="row"
                    className="sticky left-0 bg-chip px-2 py-1 text-right font-mono text-xs font-normal text-muted"
                  >
                    {r + 1}
                  </th>
                  {columns.map((name, c) => (
                    <td
                      key={name}
                      className={`max-w-[24rem] border-l border-hair px-2 py-1 align-top whitespace-pre-wrap ${/^-?[\d.,]+%?$/.test(row[c] ?? "") ? "text-right tabular-nums" : ""}`}
                    >
                      {row[c] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sheet.rows.length > shown && (
        <button
          type="button"
          className={`${toolButton} w-fit`}
          onClick={() => {
            setShown((value) => value + PAGE_ROWS * 4);
          }}
        >
          Show more rows ({count(sheet.rows.length - shown)} left)
        </button>
      )}
      {sheet.truncated && (
        <Notice>Only the first {count(MAX_ROWS)} rows are shown.</Notice>
      )}
    </div>
  );
}
