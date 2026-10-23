/**
 * ZIP archives: their entries, any of which opens in the preview (unpacked here, one
 * at a time). Gzip files are unpacked straight away and their contents shown.
 */
import { formatBytes } from "@trilleo/tool-kit";
import { fieldClasses } from "@trilleo/ui";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArchiveError,
  extractEntry,
  gunzip,
  listZip,
  type ZipEntry,
} from "../formats/archive";
import { Notice, count, toolButton, type ViewerProps } from "./common";

/** Entries listed before filtering is needed. */
const SHOWN = 300;

function ZipView({ doc, onFacts, onOpen }: ViewerProps) {
  const entries = useMemo(() => {
    try {
      return listZip(doc.bytes);
    } catch {
      return null;
    }
  }, [doc]);
  const [failed, setFailed] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const filterId = useId();

  useEffect(() => {
    if (!entries) return;
    const files = entries.filter((entry) => !entry.directory);
    onFacts([
      ["Files inside", count(files.length)],
      [
        "Unpacked size",
        formatBytes(files.reduce((sum, entry) => sum + entry.size, 0)),
      ],
    ]);
  }, [entries, onFacts]);

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const files = (entries ?? []).filter((entry) => !entry.directory);
    return needle
      ? files.filter((entry) => entry.name.toLowerCase().includes(needle))
      : files;
  }, [entries, filter]);

  if (!entries)
    return (
      <Notice role="alert">
        This archive couldn&rsquo;t be read. It may be damaged.
      </Notice>
    );

  const open = (entry: ZipEntry) => {
    try {
      const bytes = extractEntry(doc.bytes, entry.name);
      onOpen(entry.name, new Uint8Array(bytes));
    } catch (error) {
      setFailed(
        error instanceof ArchiveError
          ? error.message
          : "That file couldn't be unpacked (it may be encrypted).",
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {failed && <Notice role="alert">{failed}</Notice>}
      {entries.length > 20 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={filterId} className="type-label">
            Find a file
          </label>
          <input
            id={filterId}
            type="search"
            className={`${fieldClasses} h-11 px-3`}
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
            }}
          />
        </div>
      )}
      <ul className="flex flex-col border-t border-hair">
        {shown.slice(0, SHOWN).map((entry) => (
          <li
            key={entry.name}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-hair py-1.5 md:grid-cols-[1fr_6rem_auto]"
          >
            <span className="font-mono text-sm break-all">{entry.name}</span>
            <span className="hidden text-right text-sm text-muted md:block">
              {formatBytes(entry.size)}
            </span>
            <button
              type="button"
              className={toolButton}
              aria-label={`Open ${entry.name}`}
              onClick={() => {
                open(entry);
              }}
            >
              Open
            </button>
          </li>
        ))}
      </ul>
      {shown.length > SHOWN && (
        <p className="text-muted">
          {count(shown.length - SHOWN)} more: find them by name.
        </p>
      )}
    </div>
  );
}

function GzipView({ doc, onOpen }: ViewerProps) {
  const unpacked = useMemo((): Uint8Array<ArrayBuffer> | string => {
    try {
      return new Uint8Array(gunzip(doc.bytes));
    } catch (error) {
      return error instanceof ArchiveError
        ? error.message
        : "This file couldn't be unpacked.";
    }
  }, [doc]);
  // Opened once, even if the effect runs twice (development's strict mode).
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || typeof unpacked === "string") return;
    opened.current = true;
    const name = doc.name
      .replace(/\.tgz$/i, ".tar")
      .replace(/\.(gz|gzip)$/i, "");
    onOpen(name === doc.name ? `${doc.name}.out` : name, unpacked);
  }, [doc, unpacked, onOpen]);
  return typeof unpacked === "string" ? (
    <Notice role="alert">{unpacked}</Notice>
  ) : (
    <p role="status">Unpacking…</p>
  );
}

export default function ArchiveViewer(props: ViewerProps) {
  return props.doc.detection.kind === "gzip" ? (
    <GzipView {...props} />
  ) : (
    <ZipView {...props} />
  );
}
