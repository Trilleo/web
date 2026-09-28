// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { absolutizeUrls, addSidenotes } from "./post-html";

// The footnote markup Astro's Markdown processor (Sätteri, GFM footnotes) produces.
const withFootnotes = `<p>Cached.<sup><a href="#user-content-fn-cache" id="user-content-fnref-cache" data-footnote-ref aria-describedby="footnote-label">1</a></sup> Done.</p>
<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>
<ol>
<li id="user-content-fn-cache">
<p>Turborepo hashes <em>inputs</em>, see <a href="https://turborepo.com">docs</a>. <a href="#user-content-fnref-cache" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
</li>
</ol>
</section>`;

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("addSidenotes", () => {
  it("inserts the note right after its reference", () => {
    const doc = parse(addSidenotes(withFootnotes));
    const sup = doc.querySelector("p sup");
    const sidenote = sup?.nextElementSibling;

    expect(sidenote?.className).toBe("sidenote");
    expect(sidenote?.querySelector(".sidenote-number")?.textContent).toBe(
      "1 — ",
    );
    expect(sidenote?.textContent).toContain(
      "Turborepo hashes inputs, see docs.",
    );
    expect(sidenote?.querySelector("em")?.textContent).toBe("inputs");
  });

  it("leaves out the back link and hides the duplicate from assistive tech and search", () => {
    const sidenote = parse(addSidenotes(withFootnotes)).querySelector(
      ".sidenote",
    );

    expect(sidenote?.textContent).not.toContain("↩");
    expect(sidenote?.getAttribute("aria-hidden")).toBe("true");
    expect(sidenote?.hasAttribute("data-pagefind-ignore")).toBe(true);
    expect(sidenote?.querySelector("a")?.getAttribute("tabindex")).toBe("-1");
  });

  it("keeps the footnotes list intact", () => {
    const doc = parse(addSidenotes(withFootnotes));
    expect(
      doc.querySelector("section[data-footnotes] li a[data-footnote-backref]"),
    ).not.toBeNull();
    expect(
      doc
        .querySelector(
          "section[data-footnotes] a[href='https://turborepo.com']",
        )
        ?.hasAttribute("tabindex"),
    ).toBe(false);
  });

  it("returns HTML without footnotes unchanged", () => {
    const html = "<p>No notes here.</p>";
    expect(addSidenotes(html)).toBe(html);
  });

  it("skips references whose note is missing", () => {
    const html = `<p>x<sup><a href="#user-content-fn-gone" data-footnote-ref>1</a></sup></p><section data-footnotes><ol><li id="user-content-fn-other"><p>y</p></li></ol></section>`;
    expect(parse(addSidenotes(html)).querySelector(".sidenote")).toBeNull();
  });
});

describe("absolutizeUrls", () => {
  it("makes root-relative links and images absolute", () => {
    const doc = parse(
      absolutizeUrls(
        '<a href="/writing/x/">x</a><img src="/img/a.png" alt="">',
        "https://trilleo.example",
      ),
    );
    expect(doc.querySelector("a")?.getAttribute("href")).toBe(
      "https://trilleo.example/writing/x/",
    );
    expect(doc.querySelector("img")?.getAttribute("src")).toBe(
      "https://trilleo.example/img/a.png",
    );
  });

  it("leaves absolute, protocol-relative, and fragment URLs alone", () => {
    const html =
      '<a href="https://a.test/">a</a><a href="//cdn.test/x">b</a><a href="#fn-1">c</a>';
    expect(absolutizeUrls(html, "https://trilleo.example")).toBe(html);
  });
});
