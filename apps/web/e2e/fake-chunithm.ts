/**
 * A small CHUNITHM world for the e2e specs: SEGA's song list, otoge-db's files and an
 * sdvx.in with one drawn chart, laid out as its new viewer reads it (JSON song lists
 * under /chunithm/_/json/, WebP layers, a redirect for anything it hasn't got), so the
 * catalog update, the picture builds and the tool can be tried end to end
 * (playwright.config.ts points CHUNITHM_*_URL here). The chart's layers are drawn here
 * as sdvx.in draws them (columns 200px apart, a 48px shared band, measure numbers in
 * the gutter) and written as lossless WebP with @jsquash/webp's encoder, the jacket
 * as a PNG with node:zlib.
 */
import factory from "@jsquash/webp/codec/enc/webp_enc_simd.js";
import { defaultOptions } from "@jsquash/webp/meta.js";
import { initEmscriptenModule } from "@jsquash/webp/utils.js";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { deflateSync } from "node:zlib";

export const FAKE_CHUNITHM_PORT = 4334;
export const FAKE_CHUNITHM = `http://127.0.0.1:${String(FAKE_CHUNITHM_PORT)}`;

/** The song with a picture: a Japanese title, found by its reading or romaji. */
export const DRAWN = {
  id: 3062,
  title: "コンクエスト・チャレンジ",
  reading: "コンクエストチヤレンシ",
  artist: "サツキ feat.ろん",
};
/** A song sdvx.in lists but hasn't drawn ("_14+"). */
export const UNDRAWN = { id: 2710, title: "Oracle", artist: "DJ Noriken" };
/** The drawn chart on sdvx.in. */
export const DRAWN_REF = "11061/mst";
/** Measures in the drawn chart (its strip is 1704px: five lines 384px apart fit). */
export const DRAWN_MEASURES = 5;

// Enough songs for the sources' "this list isn't broken" checks (500).
const FILLER = 510;

function segaRow(id: number, title: string, reading: string, artist: string) {
  return {
    id: String(id),
    catname: "ORIGINAL",
    title,
    reading,
    artist,
    lev_bas: "4",
    lev_adv: "8",
    lev_exp: "11",
    lev_mas: "14+",
    lev_ult: "",
    we_kanji: "",
    we_star: "",
    image: `${String(id)}.jpg`,
  };
}

const songs = [
  segaRow(DRAWN.id, DRAWN.title, DRAWN.reading, DRAWN.artist),
  segaRow(UNDRAWN.id, UNDRAWN.title, "ORACLE", UNDRAWN.artist),
  ...Array.from({ length: FILLER }, (_, i) =>
    segaRow(10_000 + i, `Filler ${String(i)}`, `FILLER${String(i)}`, "Nobody"),
  ),
];

const otoge = songs.map((song) => ({
  ...song,
  bpm: "180",
  lev_mas_i: song.id === String(DRAWN.id) ? "14.7" : "14.5",
  lev_mas_designer: "ミニミライト",
  lev_mas_chart_link: song.id === String(DRAWN.id) ? "11/11061mst" : "",
  version: "Mate",
  date_added: "20261008",
}));

// The drawn chart: three columns, measures 384px apart.
const HEIGHT = 1000;
const TOPS = [300, 300, 600];
const COLUMN = { pitch: 200, gutter: 50, lane: 150, overlap: 48 };

function drawChart() {
  const width = COLUMN.gutter + TOPS.length * COLUMN.pitch;
  const layer = () => new Uint8Array(width * HEIGHT * 4);
  const bg = layer();
  const obj = layer();
  const bar = layer();
  const set = (data: Uint8Array, x: number, y: number, rgba: number[]) => {
    data.set(rgba, (y * width + x) * 4);
  };
  const measures = Array.from(
    { length: DRAWN_MEASURES },
    (_, i) => 24 + i * 384,
  );
  let start = 0;
  TOPS.forEach((top, k) => {
    const lane = COLUMN.gutter + k * COLUMN.pitch;
    const first = k === 0 ? 0 : start - COLUMN.overlap;
    for (let y = HEIGHT - 1; y >= top; y--) {
      const p = first + (HEIGHT - 1 - y);
      for (let x = lane; x < lane + COLUMN.lane; x++) {
        set(bg, x, y, [34, 34, 34, 255]);
        // A note every 96px (a beat), a line at each measure.
        if (p % 96 < 8 && x > lane + 20 && x < lane + 70)
          set(obj, x, y, [230, 80, 120, 255]);
        if (measures.some((m) => p >= m && p < m + 2))
          set(obj, x, y, [200, 200, 200, 255]);
      }
      if (measures.some((m) => p >= m && p < m + 14))
        for (let x = lane - 25; x < lane - 3; x++)
          set(bar, x, y, [255, 255, 255, 255]);
    }
    start = first + (HEIGHT - top);
  });
  return { width, bg, obj, bar };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function png(width: number, height: number, rgba: Uint8Array): Buffer {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    raw.set(
      rgba.subarray(y * width * 4, (y + 1) * width * 4),
      y * (width * 4 + 1) + 1,
    );
  const chunk = (type: string, body: Uint8Array) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, "latin1");
    Buffer.from(body).copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

const chart = drawChart();
const jacket = png(8, 8, new Uint8Array(8 * 8 * 4).fill(180));

/** A row of sdvx.in's song lists. */
const sdvxRow = (
  id: string,
  title: string,
  artist: string,
  master: string,
) => ({
  id,
  title,
  artist,
  genre: "ORIGINAL",
  levels: { bsc: "_4", adv: "_8", exp: "_11", mst: master, ult: "" },
  bpm: "180",
  mst: { tap: "700", hold: "90", slide: "120", air: "200", flick: "40" },
  designer: { exp: "", mst: "ミニミライト", ult: "" },
});

/** The WebP encoder, started on first use (the config imports this file too). */
interface Encoder {
  encode(
    data: Uint8Array,
    width: number,
    height: number,
    options: typeof defaultOptions,
  ): Uint8Array | null;
}
let encoder: Promise<Encoder> | null = null;
async function webp(width: number, height: number, rgba: Uint8Array) {
  encoder ??= WebAssembly.compile(
    readFileSync(
      createRequire(import.meta.url).resolve(
        "@jsquash/webp/codec/enc/webp_enc_simd.wasm",
      ),
    ),
  ).then(
    (module) =>
      initEmscriptenModule(
        factory as unknown as Parameters<typeof initEmscriptenModule>[0],
        module,
      ) as unknown as Promise<Encoder>,
  );
  const out = (await encoder).encode(rgba, width, height, {
    ...defaultOptions,
    lossless: 1,
    exact: 1,
  });
  if (!out) throw new Error("WebP encoding failed.");
  return Buffer.from(out);
}

/** The drawn chart's layers, encoded once. */
let layers: Promise<Map<string, Buffer>> | null = null;
const chartLayers = () =>
  (layers ??= (async () => {
    const [bg, obj, bar] = await Promise.all([
      webp(chart.width, HEIGHT, chart.bg),
      webp(chart.width, HEIGHT, chart.obj),
      webp(chart.width, HEIGHT, chart.bar),
    ]);
    return new Map([
      ["/chunithm/11/bg/11061bg.webp", bg],
      ["/chunithm/11/obj/data11061mst.webp", obj],
      ["/chunithm/11/obj/mrr11061mst.webp", obj],
      ["/chunithm/11/bg/11061bar.webp", bar],
    ]);
  })());

const files = new Map<string, { type: string; body: string | Buffer }>([
  [
    "/sega/music.json",
    { type: "application/json", body: JSON.stringify(songs) },
  ],
  [
    "/otoge/music-ex.json",
    { type: "application/json", body: JSON.stringify(otoge) },
  ],
  ["/otoge/music-ex-deleted.json", { type: "application/json", body: "[]" }],
  [
    "/chunithm/_/json/songs10.json",
    {
      type: "application/json",
      body: JSON.stringify([
        sdvxRow("10027", UNDRAWN.title, UNDRAWN.artist, "_14+"),
      ]),
    },
  ],
  [
    "/chunithm/_/json/songs11.json",
    {
      type: "application/json",
      body: JSON.stringify([
        sdvxRow("11000", "", "", ""),
        sdvxRow("11061", DRAWN.title, DRAWN.artist, "14+"),
      ]),
    },
  ],
  ["/chunithm/11/jacket/11061.png", { type: "image/png", body: jacket }],
]);

const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", FAKE_CHUNITHM).pathname;
  if (path === "/health") {
    response.end("ok");
    return;
  }
  void chartLayers().then((webps) => {
    const layer = webps.get(path);
    // Folders 01–09 are there, empty, as are the removed and World's End lists.
    const empty =
      /^\/chunithm\/_\/json\/songs(0\d|_del|_we|_wedel|_wecourse|_weuso)\.json$/.test(
        path,
      );
    const file = layer
      ? { type: "image/webp", body: layer }
      : (files.get(path) ??
        (empty ? { type: "application/json", body: "[]" } : undefined));
    if (!file) {
      // sdvx.in sends what it hasn't got to its front page.
      if (path.startsWith("/chunithm/"))
        response.writeHead(302, { location: "/chunithm.php" }).end();
      else response.writeHead(404).end("missing");
      return;
    }
    const body =
      typeof file.body === "string" ? Buffer.from(file.body) : file.body;
    response.writeHead(200, {
      "content-type": file.type,
      "content-length": String(body.length),
      etag: '"1"',
    });
    response.end(request.method === "HEAD" ? undefined : body);
  });
});

if (import.meta.main)
  server.listen(FAKE_CHUNITHM_PORT, "127.0.0.1", () => {
    console.log(`Fake CHUNITHM sources on ${FAKE_CHUNITHM}`);
  });
