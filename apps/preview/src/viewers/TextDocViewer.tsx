/**
 * Documents shown as plain reading text, in the site's prose style: OpenDocument
 * text (.odt, formats/odf.ts) and Rich Text (.rtf, formats/rtf.ts).
 */
import { useEffect, useMemo } from "react";
import { unzipDocument } from "../formats/archive";
import { parseOdt, type Block } from "../formats/odf";
import { rtfToParagraphs } from "../formats/rtf";
import { dataUrl } from "../formats/xml";
import { Notice, count, type ViewerProps } from "./common";

function words(texts: readonly string[]): number {
  return texts.join(" ").split(/\s+/).filter(Boolean).length;
}

function Blocks({
  blocks,
  images,
}: {
  blocks: Block[];
  images: Map<string, string>;
}) {
  return (
    <div className="prose max-w-[42rem]">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading": {
            // The page already has its h1 and h2s: the document's start at h3.
            const Tag = `h${String(Math.min(6, block.level + 2))}` as
              "h3" | "h4" | "h5" | "h6";
            return <Tag key={index}>{block.text}</Tag>;
          }
          case "paragraph":
            return (
              <p key={index} className="whitespace-pre-wrap">
                {block.text}
              </p>
            );
          case "list":
            return (
              <ul key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={index} className="overflow-x-auto">
                <table>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c} className="whitespace-pre-wrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "image": {
            const src = images.get(block.path);
            return src ? <img key={index} src={src} alt={block.alt} /> : null;
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

interface Read {
  blocks: Block[];
  images: Map<string, string>;
  facts: [string, string][];
}

function textsOf(blocks: readonly Block[]): string[] {
  return blocks.flatMap((block) =>
    block.kind === "heading" || block.kind === "paragraph"
      ? [block.text]
      : block.kind === "list"
        ? block.items
        : block.kind === "table"
          ? block.rows.flat()
          : [],
  );
}

function read(bytes: Uint8Array, isRtf: boolean): Read | null {
  try {
    if (isRtf) {
      // RTF is 7-bit text; Latin-1 keeps every byte as it is.
      const paragraphs = rtfToParagraphs(
        new TextDecoder("latin1").decode(bytes),
      );
      return {
        blocks: paragraphs.map((text) => ({
          kind: "paragraph" as const,
          text,
        })),
        images: new Map(),
        facts: [
          ["Paragraphs", count(paragraphs.filter((p) => p.trim()).length)],
          ["Words", count(words(paragraphs))],
        ],
      };
    }
    const files = unzipDocument(bytes);
    const blocks = parseOdt(files);
    const images = new Map<string, string>();
    for (const block of blocks)
      if (block.kind === "image") {
        const url = dataUrl(files, block.path);
        if (url) images.set(block.path, url);
      }
    return {
      blocks,
      images,
      facts: [["Words", count(words(textsOf(blocks)))]],
    };
  } catch {
    return null;
  }
}

export default function TextDocViewer({ doc, onFacts }: ViewerProps) {
  const isRtf = doc.detection.kind === "rtf";
  const parsed = useMemo(() => read(doc.bytes, isRtf), [doc, isRtf]);

  useEffect(() => {
    if (parsed) onFacts(parsed.facts);
  }, [parsed, onFacts]);

  if (!parsed)
    return <Notice role="alert">This document couldn&rsquo;t be read.</Notice>;
  if (
    parsed.blocks.every(
      (block) => block.kind === "paragraph" && !block.text.trim(),
    )
  )
    return <p>This document has no text.</p>;
  return (
    <div className="flex flex-col gap-4">
      <Notice>
        Shown as plain text: the document&rsquo;s own fonts and layout are left
        out.
      </Notice>
      <Blocks blocks={parsed.blocks} images={parsed.images} />
    </div>
  );
}
