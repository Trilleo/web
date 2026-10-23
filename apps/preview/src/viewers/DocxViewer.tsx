/**
 * Word documents through docx-preview, which lays them out as pages (fonts, tables,
 * pictures, headers and footers). Its output is sanitised (sanitize.ts) and shown in
 * a shadow root with its own styles, so the document can't restyle the page or load
 * anything from elsewhere.
 */
import { useEffect, useState } from "react";
import { sanitizeHtml } from "../sanitize";
import { Notice, ShadowHtml, plural, type ViewerProps } from "./common";

/** Pages keep their paper look (white, with a shadow) in both themes. */
const FRAME_CSS = `
:host { display: block; }
.docx-wrapper { background: transparent !important; padding: 0 !important; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.docx-wrapper > section.docx { box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12); margin: 0 !important; max-width: 100%; color: #111; background: #fff; }
img { max-width: 100%; }
a { color: inherit; }
`;

export default function DocxViewer({ doc, onFacts }: ViewerProps) {
  const [fragment, setFragment] = useState<DocumentFragment | null>(null);
  const [blocked, setBlocked] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // A call, not a property: TypeScript would otherwise keep its first answer.
    const stale = () => controller.signal.aborted;
    void (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        const body = document.createElement("div");
        const styles = document.createElement("div");
        await renderAsync(new Blob([doc.bytes]), body, styles, {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          renderComments: false,
          renderChanges: false,
          renderAltChunks: false,
          experimental: false,
          // data: URLs survive sanitising and the shadow root; blob: ones would leak.
          useBase64URL: true,
        });
        if (stale()) return;
        const clean = sanitizeHtml(styles.innerHTML + body.innerHTML, {
          styles: true,
        });
        setFragment(clean.fragment);
        setBlocked(clean.blockedImages);
        const pages = body.querySelectorAll("section.docx").length;
        const words = body.textContent.split(/\s+/).filter(Boolean).length;
        onFacts([
          ["Pages", `About ${String(Math.max(1, pages))}`],
          ["Words", words.toLocaleString("en-US")],
        ]);
      } catch {
        if (!stale()) setFailed(true);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [doc, onFacts]);

  if (failed)
    return (
      <Notice role="alert">
        This Word document couldn't be read. It may be damaged, or use features
        this preview doesn't know.
      </Notice>
    );
  return (
    <div className="flex flex-col gap-4">
      {blocked > 0 && (
        <Notice>
          {plural(blocked, "picture")} from other sites weren't loaded.
        </Notice>
      )}
      {!fragment && <p role="status">Laying out the document…</p>}
      <div className="overflow-x-auto bg-fig p-2 md:p-6">
        <ShadowHtml
          fragment={fragment}
          css={FRAME_CSS}
          label={`${doc.name}, as a Word document`}
        />
      </div>
    </div>
  );
}
