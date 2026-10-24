/**
 * A small CHUNITHM world for the e2e specs: SEGA's song list, otoge-db's files and an
 * sdvx.in with one drawn chart, so the catalog update, the picture builds and the tool
 * can be tried end to end (playwright.config.ts points CHUNITHM_*_URL here). The
 * chart's layers are drawn here as sdvx.in draws them (columns 200px apart, a 48px
 * shared band, measure numbers in the gutter) and written as PNGs with node:zlib.
 */
import { createServer } from "node:http";
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
/** A song sdvx.in hasn't drawn. */
export const UNDRAWN = { id: 2710, title: "Oracle", artist: "DJ Noriken" };
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

const sortScript = [
  `var TITLE11061="<div class=f1>${DRAWN.title}</div>";`,
  `var ARTIST11061="<div class=b2>\u3000/ ${DRAWN.artist}</div>";`,
  `var BPM11061="<table><tr><td class=b2>BPM<td width=2><td class=f1>180</table>";`,
  `var CR11061M="<table><tr><td class=ef>NOTES DESIGNER / ミニミライト</table>";`,
  `var LV11061M="<table><tr><td><a href=/chunithm/11/11061mst.htm><img src=/chunithm/chfiles/chlv/mst14+.png width=18 height=16></a></table>";`,
  `var CH11061M="<table><tr><td class=b2>CHAIN<td width=2><td class=mst1>777</table>";`,
  `var JK11061="<img src=/chunithm/11/jacket/11061.png width=100px height=100px>";`,
].join("\n");

const dataScript = [
  `function PNG11061M(){document.write("<img src=/chunithm/11/bg/11061bg.png height=792><p class=data><img src=/chunithm/11/obj/data11061mst.png height=792></p><p class=data><img src=/chunithm/11/bg/11061bar.png height=792></p>");}`,
  `function MRR11061M(){document.write("<img src=/chunithm/11/bg/11061bg.png height=792><p class=data><img src=/chunithm/11/obj/mirror11061mst.png height=792></p><p class=data><img src=/chunithm/11/bg/11061bar.png height=792></p>");}`,
].join("\n");

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
    "/chunithm/sort/original.htm",
    {
      type: "text/html",
      body: `<script>CHUNITHMMATELG();</script>\n<script src="/chunithm/11/js/11061sort.js"></script><script>SORT11061();</script><!--${DRAWN.title}-->\n`,
    },
  ],
  [
    "/chunithm/11/js/11061sort.js",
    { type: "text/javascript", body: sortScript },
  ],
  [
    "/chunithm/11/js/11061data.js",
    { type: "text/javascript", body: dataScript },
  ],
  [
    "/chunithm/11/bg/11061bg.png",
    { type: "image/png", body: png(chart.width, HEIGHT, chart.bg) },
  ],
  [
    "/chunithm/11/obj/data11061mst.png",
    { type: "image/png", body: png(chart.width, HEIGHT, chart.obj) },
  ],
  [
    "/chunithm/11/obj/mirror11061mst.png",
    { type: "image/png", body: png(chart.width, HEIGHT, chart.obj) },
  ],
  [
    "/chunithm/11/bg/11061bar.png",
    { type: "image/png", body: png(chart.width, HEIGHT, chart.bar) },
  ],
  ["/chunithm/11/jacket/11061.png", { type: "image/png", body: jacket }],
]);

const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", FAKE_CHUNITHM).pathname;
  if (path === "/health") {
    response.end("ok");
    return;
  }
  // Every other sdvx.in list page exists, empty.
  const file =
    files.get(path) ??
    (path.startsWith("/chunithm/") && path.endsWith(".htm")
      ? { type: "text/html", body: "<html></html>" }
      : undefined);
  if (!file) {
    response.writeHead(404).end("missing");
    return;
  }
  response.writeHead(200, { "content-type": file.type, etag: '"1"' });
  response.end(request.method === "HEAD" ? undefined : file.body);
});

if (import.meta.main)
  server.listen(FAKE_CHUNITHM_PORT, "127.0.0.1", () => {
    console.log(`Fake CHUNITHM sources on ${FAKE_CHUNITHM}`);
  });
