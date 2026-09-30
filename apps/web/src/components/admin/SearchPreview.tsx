/**
 * How a post will look in search results and as a shared link, from the editor's
 * fields as they're typed. Approximations: search engines and apps draw their own,
 * but the lengths they cut at are about these.
 */
import { formatPostDate } from "../../lib/listings";
import {
  DESCRIPTION_LENGTH,
  SEARCH_TITLE_LENGTH,
  truncate,
  type LengthVerdict,
} from "../../lib/seo";
import { SITE_NAME, SITE_URL, formatTitle } from "../../lib/site";

interface Props {
  title: string;
  seoTitle: string;
  description: string;
  seoDescription: string;
  slug: string;
  /** ISO date-time, or "". */
  publishedAt: string;
  minutes: number;
  tags: string;
}

const VERDICTS: Record<LengthVerdict, string> = {
  missing: "Missing",
  short: "Short",
  good: "Good",
  long: "Too long: it will be cut",
};

/** "54 / 60 · Good", with the problem marked in the accent colour. */
export function LengthMeter({
  id,
  length,
  limit,
  verdict,
}: {
  id: string;
  length: number;
  limit: number;
  verdict: LengthVerdict;
}) {
  const ok = verdict === "good";
  return (
    <p id={id} className="inline-flex items-center gap-2 type-label text-muted">
      <span
        className={`size-2 ${ok ? "bg-ink" : "bg-accent"}`}
        aria-hidden="true"
      />
      <span>
        {length} / {limit} · {VERDICTS[verdict]}
      </span>
    </p>
  );
}

/** What search results and link previews use: the override, else the post's own. */
export function effectiveSeo(
  props: Pick<Props, "title" | "seoTitle" | "description" | "seoDescription">,
) {
  const pageTitle = props.seoTitle.trim() || props.title.trim();
  return {
    pageTitle,
    fullTitle: formatTitle(pageTitle),
    description: props.seoDescription.trim() || props.description.trim(),
  };
}

export function SearchPreview(props: Props) {
  const { pageTitle, fullTitle, description } = effectiveSeo(props);
  const slug = props.slug || "your-post";
  const host = new URL(SITE_URL).host;
  const date = props.publishedAt ? new Date(props.publishedAt) : null;
  const facts = [
    formatPostDate(date),
    `${String(props.minutes)} min read`,
    ...props.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 2),
  ].join(" · ");

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <figure className="flex flex-col gap-3">
        <figcaption className="type-label text-muted">
          In search results
        </figcaption>
        <div className="flex flex-col gap-1 border border-hair px-5 py-4">
          <p className="flex items-center gap-2 text-sm">
            <span className="shrink-0 font-semibold">{SITE_NAME}</span>
            <span className="truncate text-muted">
              {host} › writing › {slug}
            </span>
          </p>
          <p className="text-xl leading-snug font-semibold underline decoration-hair underline-offset-4">
            {truncate(fullTitle, SEARCH_TITLE_LENGTH + 1) || "Untitled"}
          </p>
          <p className="text-sm leading-normal text-muted">
            {description
              ? truncate(description, DESCRIPTION_LENGTH + 1)
              : "No description: search engines will pick some text from the page."}
          </p>
        </div>
      </figure>

      <figure className="flex flex-col gap-3">
        <figcaption className="type-label text-muted">
          As a shared link
        </figcaption>
        <div className="flex flex-col border border-hair">
          {/* The share image (src/lib/og/render.ts), in miniature. */}
          <div
            aria-hidden="true"
            className="flex aspect-[1200/630] flex-col bg-paper px-[5.3%] py-[5%] text-ink"
          >
            <div className="flex justify-between border-b-2 border-ink pb-1.5 font-mono text-[10px] tracking-wider uppercase">
              <span>(01) Writing</span>
              <span className="text-muted">{host.replace(/^www\./, "")}</span>
            </div>
            <div className="flex flex-1 items-center gap-2.5">
              <span className="line-clamp-3 text-2xl leading-none font-bold tracking-tight md:text-3xl">
                <span className="mr-2 inline-block size-2 bg-accent align-top md:size-2.5" />
                {props.title.trim() || "Untitled"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-hair pt-1.5">
              <span className="text-xs font-semibold">{SITE_NAME}</span>
              <span className="truncate font-mono text-[10px] tracking-wider text-muted uppercase">
                {facts}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-t border-hair px-4 py-3">
            <span className="text-xs text-muted">{host}</span>
            <span className="font-semibold">{pageTitle || "Untitled"}</span>
            {description && (
              <span className="line-clamp-2 text-sm text-muted">
                {description}
              </span>
            )}
          </div>
        </div>
      </figure>
    </div>
  );
}
