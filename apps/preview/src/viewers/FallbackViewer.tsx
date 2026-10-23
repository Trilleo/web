/**
 * Files there's no viewer for: old binary Word and PowerPoint files (with a pointer
 * to Microsoft's viewer when the file came from a link), and anything else, shown as
 * its first bytes.
 */
import { hexRows } from "@trilleo/tool-inspect/hex";
import { Notice, type ViewerProps } from "./common";

/** Bytes shown in the hex view. */
export const HEX_BYTES = 1024;

export default function FallbackViewer({ doc }: ViewerProps) {
  const legacy = doc.detection.kind === "legacy-office";
  return (
    <div className="flex flex-col gap-4">
      <Notice>
        {legacy ? (
          `${doc.detection.label}s use Microsoft's old binary format, which this tool can't lay out in a browser. ${doc.finalUrl ? "Microsoft's viewer (above) can show it, or download it to open in Word or PowerPoint." : "Open it in Word or PowerPoint, or save it as .docx or .pptx and drop that here."}`
        ) : (
          <>
            There&rsquo;s no preview for this kind of file. Here are its first
            bytes; drop it on{" "}
            <a href="/tools/inspect/" className="underline underline-offset-4">
              File info
            </a>{" "}
            to learn more about it.
          </>
        )}
      </Notice>
      <pre
        className="overflow-x-auto border border-hair bg-fig p-3 font-mono text-xs leading-relaxed"
        aria-label={`First ${String(Math.min(HEX_BYTES, doc.bytes.length))} bytes in hexadecimal`}
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- it scrolls sideways, and a scrollable region must be reachable by keyboard
        tabIndex={0}
      >
        {doc.bytes.length === 0
          ? "This file is empty."
          : hexRows(doc.bytes.subarray(0, HEX_BYTES))
              .map(
                (row) => `${row.offset}  ${row.hex.padEnd(48)}  ${row.ascii}`,
              )
              .join("\n")}
      </pre>
    </div>
  );
}
