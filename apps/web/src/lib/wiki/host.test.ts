import { describe, expect, it } from "vitest";
import {
  WIKI_URL,
  isWikiHost,
  mainOrigin,
  wikiOrigin,
  wikiRedirect,
  wikiRewrite,
} from "./host";

const url = (href: string) => new URL(href);

describe("the wiki's host", () => {
  it("is wiki.<the main host>", () => {
    expect(isWikiHost(url("https://wiki.trilleo.net/x"))).toBe(true);
    expect(isWikiHost(url("http://wiki.localhost:4321/"))).toBe(true);
    expect(isWikiHost(url("https://www.trilleo.net/wiki/"))).toBe(false);
  });

  it("maps origins both ways", () => {
    expect(wikiOrigin(url("https://www.trilleo.net/"))).toBe(WIKI_URL);
    expect(mainOrigin(url("https://wiki.trilleo.net/sky/"))).toBe(
      "https://www.trilleo.net",
    );
    expect(wikiOrigin(url("http://localhost:4321/"))).toBe(
      "http://wiki.localhost:4321",
    );
    expect(wikiOrigin(url("http://127.0.0.1:4329/"))).toBe(
      "http://wiki.localhost:4329",
    );
    expect(mainOrigin(url("http://wiki.localhost:4321/"))).toBe(
      "http://localhost:4321",
    );
  });

  it("serves its paths from /wiki/, except Astro's own", () => {
    expect(
      wikiRewrite(url("https://wiki.trilleo.net/sky/Iron_Ore?x=1"))?.href,
    ).toBe("https://wiki.trilleo.net/wiki/sky/Iron_Ore?x=1");
    expect(wikiRewrite(url("https://wiki.trilleo.net/"))?.pathname).toBe(
      "/wiki/",
    );
    expect(wikiRewrite(url("https://wiki.trilleo.net/_astro/a.js"))).toBeNull();
    expect(
      wikiRewrite(url("https://wiki.trilleo.net/api/storage/uploads")),
    ).toBeNull();
  });

  it("sends /wiki/ on the main host to the wiki", () => {
    expect(wikiRedirect(url("https://www.trilleo.net/wiki/sky/X?y=1"))).toBe(
      "https://wiki.trilleo.net/sky/X?y=1",
    );
    expect(wikiRedirect(url("https://www.trilleo.net/wiki"))).toBe(
      "https://wiki.trilleo.net/",
    );
    expect(wikiRedirect(url("https://www.trilleo.net/wikis"))).toBeNull();
    expect(wikiRedirect(url("https://wiki.trilleo.net/wiki/"))).toBeNull();
  });
});
