import {
  ROBOT_RUN_A,
  ACCESSORY_ART,
  spriteWidth,
  type Sprite,
} from "./sprites";
import type { AccessoryId } from "../core";

/** Sprite inks as CSS, so pictures outside the canvas follow the theme by themselves. */
const FILLS: Readonly<Record<string, string>> = {
  "#": "var(--tr-ink)",
  o: "var(--tr-accent)",
  p: "var(--tr-paper)",
  m: "var(--tr-muted)",
  h: "var(--tr-hair)",
};

interface Layer {
  sprite: Sprite;
  x: number;
  y: number;
}

/** Horizontal runs of one ink, as rects: far fewer elements than a rect a pixel. */
function rects(layers: readonly Layer[]) {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  for (const { sprite, x, y } of layers) {
    sprite.forEach((row, rowIndex) => {
      let start = 0;
      while (start < row.length) {
        const cell = row.charAt(start);
        let end = start + 1;
        while (end < row.length && row.charAt(end) === cell) end++;
        const fill = FILLS[cell];
        if (fill)
          out.push({ x: x + start, y: y + rowIndex, w: end - start, fill });
        start = end;
      }
    });
  }
  return out;
}

/** The robot wearing an accessory (or nothing), as a small pixel picture. */
export function RobotPicture({
  accessory,
  scale = 3,
  className,
}: {
  accessory: AccessoryId | null;
  scale?: number;
  className?: string;
}) {
  // Room above the head for the tallest accessory (the party hat).
  const top = 8;
  const layers: Layer[] = [{ sprite: ROBOT_RUN_A, x: 1, y: top }];
  if (accessory) {
    const art = ACCESSORY_ART[accessory];
    layers.push({ sprite: art.sprite, x: 3 + art.dx, y: top + art.dy });
  }
  const width = spriteWidth(ROBOT_RUN_A) + 2;
  const height = ROBOT_RUN_A.length + top;
  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {rects(layers).map((rect, index) => (
        <rect
          key={index}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={1}
          fill={rect.fill}
        />
      ))}
    </svg>
  );
}
