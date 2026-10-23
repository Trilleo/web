/**
 * Markdown, rendered in the site's prose style (markdown-it with HTML off, then
 * sanitised), and HTML pages, drawn in a sandboxed frame with scripts off and nothing
 * loaded from other sites. Both have a "Source" view.
 */
import { Choice } from "@trilleo/ui";
import { useEffect, useMemo, useState } from "react";
import { sanitizeHtml } from "../sanitize";
import { CodeBlock } from "./CodeBlock";
import { MAX_TEXT_CHARS } from "./CodeViewer";
import { Notice, count, decodeText, plural, type ViewerProps } from "./common";

type MarkdownIt = typeof import("markdown-it").default;

/**
 * The frame's own policy: nothing from the network, no scripts; inline styles and
 * pictures inside the page (data: URLs) only.
 */
const FRAME_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'";

/** A page made safe to draw in the frame: its own policy first, and a base for links. */
export function framedHtml(source: string): string {
  const head = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}"><base target="_blank">`;
  // The policy must come before anything else in the page, so it's put at the very
  // start; browsers move it into the head.
  return head + source;
}

function MarkdownView({
  text,
  baseUrl,
}: {
  text: string;
  baseUrl: string | null;
}) {
  const [md, setMd] = useState<InstanceType<MarkdownIt> | null>(null);
  useEffect(() => {
    let live = true;
    void import("markdown-it").then(({ default: MarkdownIt }) => {
      if (!live) return;
      const instance = new MarkdownIt({
        html: false,
        linkify: true,
        typographer: false,
      });
      // Relative links and pictures follow the document's own address.
      const resolve = (url: string) => {
        if (!baseUrl || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("#"))
          return url;
        try {
          return new URL(url, baseUrl).href;
        } catch {
          return url;
        }
      };
      instance.normalizeLink = (
        (original) => (url: string) =>
          original(resolve(url))
      )(instance.normalizeLink.bind(instance));
      setMd(instance);
    });
    return () => {
      live = false;
    };
  }, [baseUrl]);

  const rendered = useMemo(
    () => (md ? sanitizeHtml(md.render(text)) : null),
    [md, text],
  );
  const holder = useMemo(() => {
    if (!rendered) return null;
    const div = document.createElement("div");
    div.append(rendered.fragment.cloneNode(true));
    // The page has its h1 and section h2s: the document's headings go under them.
    for (const heading of div.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
      const level = Math.min(6, Number(heading.tagName[1]) + 2);
      const next = document.createElement(`h${String(level)}`);
      next.append(...heading.childNodes);
      heading.replaceWith(next);
    }
    return div.innerHTML;
  }, [rendered]);

  if (!holder) return <p role="status">Rendering…</p>;
  return (
    <div className="flex flex-col gap-4">
      {rendered && rendered.blockedImages > 0 && (
        <Notice>
          {plural(rendered.blockedImages, "picture")} from other sites
          weren&rsquo;t loaded, so the document can&rsquo;t tell anyone you read
          it.
        </Notice>
      )}
      <div
        className="prose max-w-[42rem]"
        // Sanitised above (DOMPurify, sanitize.ts), from markdown-it with HTML off.
        dangerouslySetInnerHTML={{ __html: holder }}
      />
    </div>
  );
}

function HtmlView({ text, title }: { text: string; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <Notice>
        Drawn with scripts off and nothing loaded from other sites, so pages
        that need either look broken.
      </Notice>
      <iframe
        title={`${title}, as a web page`}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        srcDoc={framedHtml(text)}
        referrerPolicy="no-referrer"
        className="bg-white h-[75vh] w-full border border-hair"
      />
    </div>
  );
}

export default function MarkupViewer({ doc, onFacts }: ViewerProps) {
  const isMarkdown = doc.detection.kind === "markdown";
  const full = useMemo(() => decodeText(doc.bytes), [doc]);
  const text =
    full.length > MAX_TEXT_CHARS ? full.slice(0, MAX_TEXT_CHARS) : full;
  const [mode, setMode] = useState<"rendered" | "source">("rendered");

  useEffect(() => {
    const words = isMarkdown ? text.split(/\s+/).filter(Boolean).length : null;
    onFacts([
      ["Lines", count(full.split("\n").length)],
      ...(words !== null ? ([["Words", count(words)]] as const) : []),
    ]);
  }, [full, text, isMarkdown, onFacts]);

  return (
    <div className="flex flex-col gap-4">
      <Choice
        legend="Show as"
        value={mode}
        options={[
          { value: "rendered", label: isMarkdown ? "Formatted" : "Page" },
          { value: "source", label: "Source" },
        ]}
        onChange={setMode}
      />
      {mode === "source" ? (
        <CodeBlock
          code={text}
          language={isMarkdown ? "markdown" : "html"}
          label={doc.name}
        />
      ) : isMarkdown ? (
        <MarkdownView text={text} baseUrl={doc.finalUrl} />
      ) : (
        <HtmlView text={text} title={doc.name} />
      )}
      {full.length > MAX_TEXT_CHARS && (
        <Notice>
          Only the first {count(MAX_TEXT_CHARS)} characters are shown.
        </Notice>
      )}
    </div>
  );
}
