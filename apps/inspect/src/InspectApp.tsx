import {
  SNIFF_BYTES,
  detectFileType,
  formatBytes,
  type FileType,
} from "@trilleo/tool-kit";
import {
  CopyButton,
  FileDrop,
  MOTION,
  ToolSection,
  fieldClasses,
} from "@trilleo/ui";
import { MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { loadDetails, type DetailRow, type Details } from "./details";
import { formatLocalDate, formatNumber } from "./format";
import { hexRows } from "./hex";
import { extensionMismatch } from "./mismatch";
import {
  ALGORITHMS,
  describeEntropy,
  entropy,
  matchHash,
  scanFile,
  type ScanResult,
} from "./scan";

/** Bytes shown in the hex view. */
export const HEX_BYTES = 512;

/** ZIP entries listed before "Show all". */
export const ZIP_PREVIEW = 100;

interface Inspection {
  file: File;
  head: Uint8Array;
  type: FileType | null;
}

/** Things appearing: a short rise, on the site's timing (@trilleo/ui MOTION). */
const rise = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION.base, ease: MOTION.easeOut },
} as const;

function Rows({ rows }: { rows: readonly DetailRow[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 md:grid-cols-[minmax(9rem,auto)_1fr]">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-subgrid border-b border-hair py-2 md:col-span-2"
        >
          <dt className="type-label text-muted">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ZipTable({ zip }: { zip: NonNullable<Details["zip"]> }) {
  const [all, setAll] = useState(false);
  const files = zip.entries.filter((entry) => !entry.directory);
  const shown = all ? zip.entries : zip.entries.slice(0, ZIP_PREVIEW);
  const unpacked = files.reduce((sum, entry) => sum + entry.size, 0);
  return (
    <div className="flex flex-col gap-4">
      <Rows
        rows={[
          ["Entries", formatNumber(zip.total)],
          ["Files", formatNumber(files.length)],
          ["Unpacked size", formatBytes(unpacked)],
          ...(zip.entries.some((entry) => entry.encrypted)
            ? ([["Encrypted", "Some entries are password-protected"]] as const)
            : []),
          ...(zip.comment ? ([["Comment", zip.comment]] as const) : []),
        ]}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="type-label text-muted">
            <tr className="border-b border-ink">
              <th scope="col" className="py-2 pr-4 font-normal">
                Name
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">
                Size
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-normal">
                Packed
              </th>
              <th scope="col" className="py-2 pr-4 font-normal">
                Method
              </th>
              <th scope="col" className="py-2 font-normal">
                Modified
              </th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {shown.map((entry, index) => (
              <tr
                key={`${entry.name}-${String(index)}`}
                className="border-b border-hair"
              >
                <td className="py-1.5 pr-4 break-all">{entry.name}</td>
                <td className="py-1.5 pr-4 text-right whitespace-nowrap">
                  {entry.directory ? "—" : formatBytes(entry.size)}
                </td>
                <td className="py-1.5 pr-4 text-right whitespace-nowrap">
                  {entry.directory ? "—" : formatBytes(entry.compressedSize)}
                </td>
                <td className="py-1.5 pr-4 whitespace-nowrap">
                  {entry.method}
                </td>
                <td className="py-1.5 whitespace-nowrap">
                  {entry.modified ? formatLocalDate(entry.modified) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {zip.entries.length > ZIP_PREVIEW && (
        <button
          type="button"
          className="w-fit type-label underline underline-offset-4"
          onClick={() => {
            setAll((value) => !value);
          }}
        >
          {all
            ? `Show the first ${String(ZIP_PREVIEW)}`
            : `Show all ${formatNumber(zip.entries.length)}`}
        </button>
      )}
      {zip.total > zip.entries.length && (
        <p className="text-muted">
          Listing stops at {formatNumber(zip.entries.length)} entries.
        </p>
      )}
    </div>
  );
}

export function InspectApp() {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [read, setRead] = useState(0);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanFailed, setScanFailed] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const [expected, setExpected] = useState("");
  const controller = useRef<AbortController | null>(null);
  const expectedId = useId();

  useEffect(() => () => controller.current?.abort(), []);

  const inspect = async (file: File) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    const { signal } = current;
    // A newer file replaces this one; its results are then dropped.
    const stale = () => controller.current !== current;

    const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
    if (stale()) return;
    const type = detectFileType(head);
    setInspection({ file, head, type });
    setRead(0);
    setScan(null);
    setScanFailed(false);
    setDetails(null);

    void loadDetails(file, type)
      .catch((): Details => ({ groups: [] }))
      .then((result) => {
        if (!stale()) setDetails(result);
      });
    try {
      const result = await scanFile(file, { onProgress: setRead, signal });
      if (!stale()) setScan(result);
    } catch {
      if (!stale()) setScanFailed(true);
    }
  };

  const file = inspection?.file;
  const type = inspection?.type ?? null;
  const match =
    scan && expected.trim() ? matchHash(expected, scan.hashes) : null;
  const percent =
    file && file.size > 0 ? Math.round((read / file.size) * 100) : 100;
  const bits = scan ? entropy(scan.histogram) : null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col gap-10 md:gap-12">
        <FileDrop
          title={file ? "Inspect another file" : "Drop a file here"}
          hint="Any type, any size. It's read in this browser and never uploaded. You can also paste one."
          acceptPaste
          onFiles={(files) => {
            const [first] = files;
            if (first) void inspect(first);
          }}
        />

        {inspection && file && (
          <motion.div
            key={`${file.name}-${String(file.lastModified)}-${String(file.size)}`}
            {...rise}
            className="flex flex-col gap-10 md:gap-12"
          >
            <ToolSection number="01" title="Overview">
              <p className="mb-4 type-card break-all">{file.name}</p>
              <Rows
                rows={[
                  [
                    "Size",
                    `${formatBytes(file.size)} (${formatNumber(file.size)} bytes)`,
                  ],
                  [
                    "Detected type",
                    type
                      ? `${type.label} (${type.mime})`
                      : "Unknown binary data",
                  ],
                  [
                    "Browser reports",
                    file.type || "Nothing (no known extension)",
                  ],
                  [
                    "Last modified",
                    file.lastModified
                      ? formatLocalDate(new Date(file.lastModified))
                      : "Unknown",
                  ],
                  ...(bits !== null
                    ? ([
                        [
                          "Entropy",
                          `${bits.toFixed(3)} bits per byte: ${describeEntropy(bits)}`,
                        ],
                      ] as const)
                    : []),
                ]}
              />
              {type && extensionMismatch(file.name, type) && (
                <p role="note" className="mt-4 border-l-2 border-accent pl-4">
                  The name says “.{file.name.split(".").pop()}”, but the
                  contents are a {type.label} (usually “.{type.ext}”).
                </p>
              )}
            </ToolSection>

            <ToolSection number="02" title="Hashes">
              {!scan && !scanFailed && (
                <div className="flex flex-col gap-2">
                  <p className="type-label" id="hash-progress">
                    Reading… {formatBytes(read)} of {formatBytes(file.size)}
                  </p>
                  <div
                    role="progressbar"
                    aria-labelledby="hash-progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    className="h-1 w-full bg-chip"
                  >
                    <div
                      className="h-full bg-accent transition-[width] duration-(--tr-dur-fast) ease-swiss"
                      style={{ width: `${String(percent)}%` }}
                    />
                  </div>
                </div>
              )}
              {scanFailed && (
                <p className="border-l-2 border-accent pl-4">
                  This file couldn't be read. It may have been moved, or be too
                  big for this browser.
                </p>
              )}
              {scan && (
                <div className="flex flex-col gap-6">
                  <ul className="flex flex-col border-t border-hair">
                    {ALGORITHMS.map((algorithm) => (
                      <li
                        key={algorithm.id}
                        className={`grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 border-b border-hair py-2 md:grid-cols-[6rem_1fr_auto] ${match === algorithm.id ? "bg-chip" : ""}`}
                      >
                        <span className="col-start-1 row-start-1 type-label text-muted md:pt-1">
                          {algorithm.label}
                          {match === algorithm.id && (
                            <span className="text-ink"> · Match</span>
                          )}
                        </span>
                        <code
                          className="col-span-2 col-start-1 row-start-2 font-mono text-sm break-all md:col-span-1 md:col-start-2 md:row-start-1"
                          data-hash={algorithm.id}
                        >
                          {scan.hashes[algorithm.id]}
                        </code>
                        <CopyButton
                          value={scan.hashes[algorithm.id]}
                          label={`Copy ${algorithm.label}`}
                          className="col-start-2 row-start-1 md:col-start-3"
                        />
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={expectedId} className="type-label">
                      Check against a hash
                    </label>
                    <input
                      id={expectedId}
                      value={expected}
                      onChange={(event) => {
                        setExpected(event.target.value);
                      }}
                      placeholder="Paste the hash you were given"
                      spellCheck={false}
                      autoComplete="off"
                      className={`${fieldClasses} h-11 px-3 font-mono text-sm`}
                    />
                    <p role="status" className="min-h-6">
                      {expected.trim() &&
                        (match
                          ? `Matches the ${ALGORITHMS.find((algorithm) => algorithm.id === match)?.label ?? ""} hash.`
                          : "No match: this isn't any of the hashes above.")}
                    </p>
                  </div>
                </div>
              )}
            </ToolSection>

            {details && (details.groups.length > 0 || details.zip) && (
              <ToolSection number="03" title="Details">
                <div className="flex flex-col gap-8">
                  {details.groups.map((group) => (
                    <div key={group.title} className="flex flex-col gap-2">
                      <h3 className="font-medium">{group.title}</h3>
                      <Rows rows={group.rows} />
                      {group.more && (
                        <details className="mt-2">
                          <summary className="cursor-pointer type-label">
                            All {formatNumber(group.more.length)} tags
                          </summary>
                          <div className="mt-2">
                            <Rows rows={group.more} />
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                  {details.zip && <ZipTable zip={details.zip} />}
                </div>
              </ToolSection>
            )}
            {!details && (
              <p className="text-muted" role="status">
                Reading details…
              </p>
            )}

            <ToolSection
              number={
                details && (details.groups.length > 0 || details.zip)
                  ? "04"
                  : "03"
              }
              title="First bytes"
            >
              <pre
                className="overflow-x-auto border border-hair bg-fig p-3 font-mono text-xs leading-relaxed"
                aria-label={`First ${String(Math.min(HEX_BYTES, inspection.head.length))} bytes in hexadecimal`}
                // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- it scrolls sideways, and a scrollable region must be reachable by keyboard
                tabIndex={0}
              >
                {inspection.head.length === 0
                  ? "This file is empty."
                  : hexRows(inspection.head.subarray(0, HEX_BYTES))
                      .map(
                        (row) =>
                          `${row.offset}  ${row.hex.padEnd(48)}  ${row.ascii}`,
                      )
                      .join("\n")}
              </pre>
            </ToolSection>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}
