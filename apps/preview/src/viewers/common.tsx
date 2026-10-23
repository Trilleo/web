/** Pieces every viewer uses: what it's given, notices, toolbars, and safe HTML. */
import { useEffect, useRef, type ReactNode } from "react";
import type { Detection } from "../detect";

export interface PreviewDoc {
  name: string;
  bytes: Uint8Array<ArrayBuffer>;
  detection: Detection;
  /** Where it came from, for links: the address after redirects. */
  finalUrl: string | null;
}

/** A line in the facts column ("Pages", "12"). */
export type Fact = readonly [label: string, value: string];

export interface ViewerProps {
  doc: PreviewDoc;
  /** Viewers add what they learn (pages, sheets, words). */
  onFacts: (facts: readonly Fact[]) => void;
  /** Opens a file inside this one (an archive's entry, a gzip's contents). */
  onOpen: (name: string, bytes: Uint8Array<ArrayBuffer>) => void;
}

/** A remark above or instead of a preview, in the site's left-rule style. */
export function Notice({
  children,
  role = "note",
}: {
  children: ReactNode;
  role?: "note" | "alert" | "status";
}) {
  return (
    <p role={role} className="border-l-2 border-accent pl-4">
      {children}
    </p>
  );
}

/** A row of controls over a preview. */
export function Toolbar({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="toolbar"
      aria-label={label}
      className="flex flex-wrap items-center gap-2 border-b border-hair pb-3"
    >
      {children}
    </div>
  );
}

/** Small square-ish buttons for toolbars. */
export const toolButton =
  "press inline-flex h-9 min-w-9 items-center justify-center border border-ink px-3 type-label hover:bg-chip disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-ink aria-pressed:text-paper";

/**
 * Points an <img>, <audio> or <video> at some bytes through a blob: URL, revoked when
 * the bytes change or the element goes. Set on the element directly, so no render
 * has to wait for the URL.
 */
export function useBlobSource<T extends HTMLImageElement | HTMLMediaElement>(
  bytes: Uint8Array<ArrayBuffer> | null,
  type: string,
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!bytes || !element) return;
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    element.src = url;
    return () => {
      element.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
  }, [bytes, type]);
  return ref;
}

/**
 * Sanitised HTML (a DocumentFragment from sanitize.ts) in a shadow root, so a
 * document's own styles stay inside it and the page's don't reach in. `css` is added
 * as the root's own stylesheet.
 */
export function ShadowHtml({
  fragment,
  css,
  className,
  label,
  onClick,
}: {
  fragment: DocumentFragment | null;
  css?: string;
  className?: string;
  label: string;
  onClick?: (event: MouseEvent) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const root = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    root.replaceChildren();
    if (css) {
      const style = document.createElement("style");
      style.textContent = css;
      root.append(style);
    }
    if (fragment) root.append(fragment.cloneNode(true));
  }, [fragment, css]);
  useEffect(() => {
    const element = host.current;
    if (!element || !onClick) return;
    const root = element.shadowRoot;
    const listener = (event: Event) => {
      onClick(event as MouseEvent);
    };
    root?.addEventListener("click", listener);
    return () => {
      root?.removeEventListener("click", listener);
    };
  }, [onClick, fragment]);
  return (
    <div ref={host} role="document" aria-label={label} className={className} />
  );
}

/** "1,234" */
export const count = (value: number) => value.toLocaleString("en-US");

export function plural(value: number, one: string, many = `${one}s`): string {
  return `${count(value)} ${value === 1 ? one : many}`;
}

/** Text from bytes: UTF-16 when a byte order mark says so, otherwise UTF-8. */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}
