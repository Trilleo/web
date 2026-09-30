import { MOTION } from "@trilleo/ui";
import { AnimatePresence, motion } from "motion/react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { camera, drawWorld, type Tone } from "./draw";
import type { View } from "./session";

/** Geist Mono's advance is 0.6em; rows are 1.2em apart. */
const CELL_EM = 0.6;
const LINE_EM = 1.2;
const MIN_FONT = 13;
const MAX_FONT = 30;

const TONE_CLASS: Record<Tone, string> = {
  dim: "text-muted",
  ink: "text-ink",
  strong: "font-bold text-ink",
  mark: "bg-accent font-bold text-on-accent",
};

const TONE_CODE: Record<Tone, string> = {
  dim: "d",
  ink: "i",
  strong: "s",
  mark: "m",
};
const CODE_TONE: Record<string, Tone> = {
  d: "dim",
  i: "ink",
  s: "strong",
  m: "mark",
};

export interface WorldViewProps {
  view: View;
  now: number;
  onTile: (x: number, y: number) => void;
}

/** The island around you, as big as the space allows. */
export function WorldView({ view, now, onTile }: WorldViewProps) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();
    // Without it (old browsers, tests) the island is drawn whole at the smallest size.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const drawing = drawWorld(view.state, view.busy, now);
  const fit = Math.min(
    size.width / (drawing.width * CELL_EM),
    size.height / (drawing.height * LINE_EM),
  );
  const font = Math.max(
    MIN_FONT,
    Math.min(MAX_FONT, Math.floor(fit || MIN_FONT)),
  );
  const cam = camera(
    drawing,
    {
      cols: Math.floor(size.width / (font * CELL_EM)) || drawing.width,
      rows: Math.floor(size.height / (font * LINE_EM)) || drawing.height,
    },
    view.state.pos,
  );

  const rows = [];
  for (let y = cam.y; y < cam.y + cam.rows; y++) {
    const chars = drawing.chars[y]?.slice(cam.x, cam.x + cam.cols) ?? [];
    const tones = drawing.tones[y]?.slice(cam.x, cam.x + cam.cols) ?? [];
    rows.push(
      <WorldRow
        key={y}
        chars={chars.join("\u0000")}
        tones={tones.map((tone) => TONE_CODE[tone]).join("")}
      />,
    );
  }

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x =
      Math.floor((event.clientX - rect.left) / (font * CELL_EM)) + cam.x;
    const y = Math.floor((event.clientY - rect.top) / (font * LINE_EM)) + cam.y;
    onTile(x, y);
  };

  const floaters = view.floaters.filter(
    (floater) => floater.island === view.state.pos.island,
  );

  return (
    <div
      ref={box}
      className="relative grid h-full min-h-0 w-full place-items-center overflow-hidden"
    >
      {/* A drawing: clicks walk there. The keyboard works on the whole game. */}
      <div
        aria-hidden="true"
        className="relative cursor-pointer font-mono select-none"
        style={{ fontSize: `${String(font)}px`, lineHeight: LINE_EM }}
        onClick={handleClick}
        data-testid="world"
      >
        {rows}
        <AnimatePresence>
          {floaters.map((floater, index) => (
            <motion.span
              key={floater.id}
              className="pointer-events-none absolute z-10 bg-paper px-1 text-[12px] leading-tight font-semibold whitespace-nowrap text-ink"
              style={{
                left: `${String((floater.x - cam.x) * CELL_EM)}em`,
                top: `${String((floater.y - cam.y) * LINE_EM)}em`,
              }}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: -18 - index * 16 }}
              exit={{ opacity: 0 }}
              transition={{ duration: MOTION.slow, ease: MOTION.easeOut }}
            >
              {floater.text}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

const WorldRow = memo(function WorldRow({
  chars,
  tones,
}: {
  chars: string;
  tones: string;
}) {
  const cells = chars.split("\u0000");
  return (
    <div className="flex">
      {cells.map((char, x) => (
        <span
          key={x}
          className={`inline-block w-[1ch] shrink-0 text-center whitespace-pre ${TONE_CLASS[CODE_TONE[tones[x] ?? "i"] ?? "ink"]}`}
        >
          {char}
        </span>
      ))}
    </div>
  );
});
