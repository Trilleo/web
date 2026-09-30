/**
 * Draws a share card (lib/seo.ts's OgCard) as a 1200×630 PNG: satori lays it out as
 * SVG, resvg rasterizes it. Both are JavaScript/WebAssembly, so the server bundle
 * carries them (the app image has no node_modules). The fonts and resvg's
 * WebAssembly are inlined into the bundle by Vite's `?inline`.
 *
 * satori is pinned to 0.32: later versions shape text with harfbuzzjs, which reads
 * its WebAssembly from its own folder and so can't run from the bundle.
 */
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm?inline";
import groteskBold from "@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff?inline";
import groteskSemibold from "@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-600-normal.woff?inline";
import monoMedium from "@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff?inline";
import satori from "satori";
import {
  CARD_META_LENGTH,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  type OgCard,
} from "../seo";

// The light theme's tokens (packages/ui/src/styles/theme.css). Cards are always
// light: they sit in other apps' timelines, whatever this site's theme is.
const PAPER = "#f2f2ee";
const INK = "#0e0e0e";
const MUTED = "#5c5c57";
const HAIR = "#cfcfc8";
const ACCENT = "#e5470f";

const PADDING = 64;

/** The Trilleo mark (components/Logo.astro), with its accent dot. */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="160 162 704 704"><path fill="${INK}" d="M174 198H849V304H284V827H174Z"/><path fill="${INK}" d="M399 415H616V521H505V827H399Z"/><path fill="${INK}" d="M721 589H828V827H721Z"/><path fill="${ACCENT}" d="M748 401L848 438L811 538L711 501Z"/></svg>`;
const LOGO = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

/** A `data:` URL's bytes. */
function dataUrlBytes(url: string): Buffer {
  return Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
}

// satori takes React-shaped elements; building them by hand keeps this a .ts file.
interface Node {
  type: string;
  props: Record<string, unknown> & { style?: Record<string, unknown> };
}

function h(
  type: string,
  style: Record<string, unknown>,
  ...children: (Node | string)[]
): Node {
  // satori insists on flex layout for anything with several children; use it throughout.
  return { type, props: { style: { display: "flex", ...style }, children } };
}

/** Longer titles get smaller type, so up to about four lines fit. */
export function titleSize(title: string): number {
  const length = title.length;
  if (length <= 20) return 112;
  if (length <= 40) return 88;
  if (length <= 70) return 72;
  return 60;
}

/** At most `max` characters, with an ellipsis. */
function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function label(text: string, color: string): Node {
  return h(
    "div",
    {
      fontFamily: "Geist Mono",
      fontSize: 22,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color,
    },
    text,
  );
}

function card({ section, title, meta }: OgCard): Node {
  const size = titleSize(title);
  return h(
    "div",
    {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      flexDirection: "column",
      backgroundColor: PAPER,
      color: INK,
      padding: PADDING,
      fontFamily: "Schibsted Grotesk",
    },
    // Top: the section on the left, the site on the right, over a rule.
    h(
      "div",
      {
        justifyContent: "space-between",
        paddingBottom: 18,
        borderBottom: `3px solid ${INK}`,
      },
      label(clip(section, 40), INK),
      label("trilleo.net", MUTED),
    ),
    // Middle: the title, centred between the rules, with the accent square
    // hanging beside its first line.
    h(
      "div",
      { flex: 1, alignItems: "center" },
      h(
        "div",
        { flex: 1, alignItems: "flex-start", gap: 28 },
        h("div", {
          width: 24,
          height: 24,
          flexShrink: 0,
          // Level with the top of the first line's capitals.
          marginTop: size * 0.2,
          backgroundColor: ACCENT,
        }),
        h(
          "div",
          {
            flex: 1,
            fontSize: size,
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: "-0.045em",
          },
          clip(title, 110),
        ),
      ),
    ),
    // Bottom: the logo and name, and the facts.
    h(
      "div",
      {
        alignItems: "center",
        justifyContent: "space-between",
        gap: 40,
        paddingTop: 22,
        borderTop: `1px solid ${HAIR}`,
      },
      h(
        "div",
        { alignItems: "center", gap: 18, flexShrink: 0 },
        {
          type: "img",
          props: { src: LOGO, width: 52, height: 52 },
        },
        h(
          "div",
          { fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" },
          "Trilleo Network",
        ),
      ),
      h(
        "div",
        {
          justifyContent: "flex-end",
          overflow: "hidden",
          whiteSpace: "nowrap",
        },
        label(clip(meta, CARD_META_LENGTH), MUTED),
      ),
    ),
  );
}

let ready: Promise<void> | undefined;

/** resvg's WebAssembly, compiled once per process. */
function initResvg(): Promise<void> {
  ready ??= initWasm(dataUrlBytes(resvgWasm));
  return ready;
}

const fonts = [
  {
    name: "Schibsted Grotesk",
    data: dataUrlBytes(groteskBold),
    weight: 700 as const,
    style: "normal" as const,
  },
  {
    name: "Schibsted Grotesk",
    data: dataUrlBytes(groteskSemibold),
    weight: 600 as const,
    style: "normal" as const,
  },
  {
    name: "Geist Mono",
    data: dataUrlBytes(monoMedium),
    weight: 500 as const,
    style: "normal" as const,
  },
];

/** The card as SVG (what satori makes; tests look at this). */
export async function renderCardSvg(input: OgCard): Promise<string> {
  // satori's types want a ReactNode; these plain objects are what JSX compiles to.
  return satori(card(input) as unknown as Parameters<typeof satori>[0], {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    fonts,
  });
}

/** The card as a PNG. */
export async function renderCard(
  input: OgCard,
): Promise<Uint8Array<ArrayBuffer>> {
  const [svg] = await Promise.all([renderCardSvg(input), initResvg()]);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_IMAGE_WIDTH },
  });
  try {
    // Copied out of WebAssembly memory, into a buffer a Response accepts.
    return new Uint8Array(resvg.render().asPng());
  } finally {
    resvg.free();
  }
}
