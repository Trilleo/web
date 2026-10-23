/**
 * EPUB books, a chapter at a time in the site's prose style, with the book's contents
 * to move around. The book's own stylesheets are left out; its text is sanitised
 * (sanitize.ts), and links between chapters move to that chapter.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { unzipDocument } from "../formats/archive";
import { chapterHtml, parseEpub, type Book } from "../formats/epub";
import type { Files } from "../formats/xml";
import { sanitizeHtml } from "../sanitize";
import {
  Notice,
  ShadowHtml,
  Toolbar,
  count,
  plural,
  toolButton,
  type ViewerProps,
} from "./common";

/** The reading styles inside the shadow root (tokens reach in through inheritance). */
const BOOK_CSS = `
:host { display: block; font-family: var(--font-serif, Georgia, serif); font-size: 1.125rem; line-height: 1.65; color: var(--tr-ink); max-width: 42rem; }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-sans, sans-serif); line-height: 1.15; letter-spacing: -0.02em; margin: 2em 0 0.6em; }
h1 { font-size: 2rem; } h2 { font-size: 1.5rem; } h3 { font-size: 1.25rem; }
p { margin: 0 0 1em; }
img, svg { max-width: 100%; height: auto; }
a { color: inherit; text-decoration: underline; text-underline-offset: 0.2em; }
blockquote { margin: 1.5em 0; padding-left: 1em; border-left: 2px solid var(--tr-accent); }
pre { overflow-x: auto; font-family: var(--font-mono, monospace); font-size: 0.875rem; }
table { border-collapse: collapse; } td, th { border: 1px solid var(--tr-hair); padding: 0.25em 0.5em; }
`;

export default function EpubViewer({ doc, onFacts }: ViewerProps) {
  const parsed = useMemo(() => {
    try {
      const files = unzipDocument(doc.bytes);
      return { files, book: parseEpub(files) };
    } catch {
      return null;
    }
  }, [doc]);
  const files: Files | null = parsed?.files ?? null;
  const book: Book | null = parsed?.book ?? null;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!book) return;
    const facts: [string, string][] = [];
    if (book.title) facts.push(["Title", book.title]);
    if (book.author) facts.push(["Author", book.author]);
    facts.push(["Chapters", count(book.chapters.length)]);
    onFacts(facts);
  }, [book, onFacts]);

  const chapter = book?.chapters[index];
  const content = useMemo(() => {
    if (!files || !chapter) return null;
    return sanitizeHtml(chapterHtml(files, chapter.path));
  }, [files, chapter]);

  const onClick = useCallback(
    (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a");
      const href = link?.getAttribute("href") ?? "";
      if (!href.startsWith("#chapter:") || !book) return;
      event.preventDefault();
      const path = href.slice("#chapter:".length);
      const next = book.chapters.findIndex((each) => each.path === path);
      if (next !== -1) setIndex(next);
    },
    [book],
  );

  if (!book)
    return <Notice role="alert">This book couldn&rsquo;t be read.</Notice>;
  if (!chapter) return <p>This book has no chapters to show.</p>;

  const nav = (
    <Toolbar label="Chapters">
      <button
        type="button"
        className={toolButton}
        disabled={index === 0}
        onClick={() => {
          setIndex(index - 1);
        }}
      >
        Previous
      </button>
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <span className="sr-only">Chapter</span>
        <select
          className="h-9 min-w-0 flex-1 border border-ink bg-paper px-2"
          value={index}
          onChange={(event) => {
            setIndex(Number(event.target.value));
          }}
        >
          {book.chapters.map((each, i) => (
            <option key={each.path} value={i}>
              {each.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={toolButton}
        disabled={index === book.chapters.length - 1}
        onClick={() => {
          setIndex(index + 1);
        }}
      >
        Next
      </button>
    </Toolbar>
  );

  return (
    <div className="flex flex-col gap-6">
      {book.title && (
        <p className="type-card">
          {book.title}
          {book.author && <span className="text-muted"> · {book.author}</span>}
        </p>
      )}
      {nav}
      {content && content.blockedImages > 0 && (
        <Notice>
          {plural(content.blockedImages, "picture")} from other sites
          weren&rsquo;t loaded.
        </Notice>
      )}
      <ShadowHtml
        fragment={content?.fragment ?? null}
        css={BOOK_CSS}
        label={chapter.title}
        onClick={onClick}
      />
      {nav}
    </div>
  );
}
