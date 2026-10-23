/**
 * Text files: source code and plain text highlighted (CodeBlock), and JSON and XML
 * also as a tree to fold open, which reads better than the raw text for data.
 */
import { Choice } from "@trilleo/ui";
import { useEffect, useMemo, useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { Notice, count, decodeText, type ViewerProps } from "./common";

/** Text past this is cut off (the rest would only slow the page). */
export const MAX_TEXT_CHARS = 2_000_000;
/** Children listed under one node of a tree before "and N more". */
const TREE_CHILDREN = 500;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function JsonValue({ value }: { value: Json }) {
  if (value === null) return <span className="text-muted">null</span>;
  if (typeof value === "string")
    return <span className="break-all">&ldquo;{value}&rdquo;</span>;
  if (typeof value !== "object") return <span>{String(value)}</span>;
  return null;
}

function JsonNode({
  name,
  value,
  open = false,
}: {
  name: string | null;
  value: Json;
  open?: boolean;
}) {
  const label = name !== null && <span className="text-muted">{name}: </span>;
  if (value === null || typeof value !== "object")
    return (
      <li className="py-0.5 font-mono text-sm">
        {label}
        <JsonValue value={value} />
      </li>
    );
  const entries: [string, Json][] = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
  const summary = Array.isArray(value)
    ? `[${count(entries.length)}]`
    : `{${count(entries.length)}}`;
  return (
    <li className="py-0.5 font-mono text-sm">
      <details open={open}>
        <summary className="cursor-pointer">
          {label}
          <span className="text-muted">{summary}</span>
        </summary>
        <ul className="ml-2 border-l border-hair pl-4">
          {entries.slice(0, TREE_CHILDREN).map(([key, item]) => (
            <JsonNode key={key} name={key} value={item} />
          ))}
          {entries.length > TREE_CHILDREN && (
            <li className="text-muted">
              and {count(entries.length - TREE_CHILDREN)} more
            </li>
          )}
        </ul>
      </details>
    </li>
  );
}

function XmlNode({ node, open = false }: { node: Element; open?: boolean }) {
  const attributes = [...node.attributes];
  const kids = [...node.childNodes].filter(
    (child) =>
      child.nodeType === Node.ELEMENT_NODE ||
      (child.nodeType === Node.TEXT_NODE &&
        Boolean(child.textContent?.trim())) ||
      child.nodeType === Node.CDATA_SECTION_NODE,
  );
  const tag = (
    <>
      <span>&lt;{node.nodeName}</span>
      {attributes.map((attribute) => (
        <span key={attribute.name} className="text-muted">
          {" "}
          {attribute.name}=&ldquo;{attribute.value}&rdquo;
        </span>
      ))}
      <span>&gt;</span>
    </>
  );
  if (kids.length === 0)
    return <li className="py-0.5 font-mono text-sm break-all">{tag}</li>;
  if (kids.length === 1 && kids[0]?.nodeType !== Node.ELEMENT_NODE)
    return (
      <li className="py-0.5 font-mono text-sm break-all">
        {tag}
        {kids[0]?.textContent?.trim()}
      </li>
    );
  return (
    <li className="py-0.5 font-mono text-sm break-all">
      <details open={open}>
        <summary className="cursor-pointer">{tag}</summary>
        <ul className="ml-2 border-l border-hair pl-4">
          {kids.slice(0, TREE_CHILDREN).map((child, index) =>
            child instanceof Element ? (
              <XmlNode key={index} node={child} />
            ) : (
              <li key={index} className="py-0.5">
                {child.textContent?.trim()}
              </li>
            ),
          )}
          {kids.length > TREE_CHILDREN && (
            <li className="text-muted">
              and {count(kids.length - TREE_CHILDREN)} more
            </li>
          )}
        </ul>
      </details>
    </li>
  );
}

export default function CodeViewer({ doc, onFacts }: ViewerProps) {
  const { kind } = doc.detection;
  const full = useMemo(() => decodeText(doc.bytes), [doc]);
  const text =
    full.length > MAX_TEXT_CHARS ? full.slice(0, MAX_TEXT_CHARS) : full;
  const language =
    kind === "json"
      ? "json"
      : kind === "xml"
        ? "xml"
        : (doc.detection.language ?? "text");

  const tree = useMemo((): { json: Json } | { xml: Element } | null => {
    try {
      if (kind === "json") return { json: JSON.parse(full) as Json };
      if (kind === "xml") {
        const parsed = new DOMParser().parseFromString(full, "application/xml");
        if (parsed.getElementsByTagName("parsererror").length > 0) return null;
        return { xml: parsed.documentElement };
      }
    } catch {
      // Not valid: the text view still shows it.
    }
    return null;
  }, [full, kind]);
  const [mode, setMode] = useState<"tree" | "text">("tree");

  useEffect(() => {
    const lines = full.split("\n").length;
    onFacts([
      ["Lines", count(lines)],
      ["Characters", count(full.length)],
      ...(language !== "text" ? ([["Language", language]] as const) : []),
    ]);
  }, [full, language, onFacts]);

  return (
    <div className="flex flex-col gap-4">
      {(kind === "json" || kind === "xml") && !tree && (
        <Notice>
          This isn&rsquo;t valid {kind === "json" ? "JSON" : "XML"}, so
          it&rsquo;s shown as text.
        </Notice>
      )}
      {tree && (
        <Choice
          legend="Show as"
          value={mode}
          options={[
            { value: "tree", label: "Tree" },
            { value: "text", label: "Text" },
          ]}
          onChange={setMode}
        />
      )}
      {tree && mode === "tree" ? (
        <ul className="overflow-x-auto border-t border-hair pt-2">
          {"json" in tree ? (
            <JsonNode name={null} value={tree.json} open />
          ) : (
            <XmlNode node={tree.xml} open />
          )}
        </ul>
      ) : (
        <CodeBlock code={text} language={language} label={doc.name} />
      )}
      {full.length > MAX_TEXT_CHARS && (
        <Notice>
          Only the first {count(MAX_TEXT_CHARS)} characters are shown.
        </Notice>
      )}
    </div>
  );
}
