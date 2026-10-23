import {
  BIOMES,
  GROUND_Y,
  PIXELS_PER_METRE,
  PLAYER_X,
  VIEW_H,
  VIEW_W,
  type AccessoryId,
  type BiomeId,
  type Obstacle,
  type RunEvent,
  type RunState,
} from "../core";
import { paletteKey, type Palette } from "./palette";
import {
  ACCESSORY_ART,
  BUG_A,
  BUG_B,
  CLOUD,
  DIGITS,
  DRONE_A,
  DRONE_B,
  FLAME_A,
  FLAME_B,
  POWER_COMPACT,
  POWER_MAGNET,
  POWER_SHIELD,
  ROBOT_CRASH,
  ROBOT_JUMP,
  ROBOT_RUN_A,
  ROBOT_RUN_B,
  ROBOT_SLIDE,
  TOKEN,
  spriteWidth,
  type Sprite,
} from "./sprites";

/*
 * Draws a run in course pixels (VIEW_W × VIEW_H) onto a canvas of any size. Every
 * edge is snapped to the screen's own pixels, so things move smoothly, a screen
 * pixel at a time, rather than in steps of a whole course pixel; sprites are
 * scaled once and then copied. Nothing here changes the run: scenery and sparks
 * come from hashes and the step count.
 */

type Ink = keyof Palette;

const SPRITE_INKS: Readonly<Record<string, Ink>> = {
  "#": "ink",
  o: "accent",
  p: "paper",
  m: "muted",
  h: "hair",
};

/** Sparks and debris: only for show. */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ink: Ink;
}

export interface Effects {
  particles: Particle[];
  /** Frames left of shaking after a crash. */
  shake: number;
}

export function newEffects(): Effects {
  return { particles: [], shake: 0 };
}

/** Small numbers from integers, for scenery that stays put as it scrolls. */
function hash(a: number, b = 0): number {
  let h =
    Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^
    Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Adds what a step's events set off. Reduced motion: none of it. */
export function react(
  effects: Effects,
  events: readonly RunEvent[],
  state: RunState,
  reduced: boolean,
): void {
  if (reduced) return;
  const burst = (x: number, y: number, count: number, ink: Ink, power = 1) => {
    for (let index = 0; index < count; index++) {
      const angle = hash(state.frame, index) * Math.PI * 2;
      const speed = (0.6 + hash(index, state.frame) * 1.6) * power;
      effects.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        life: 18 + Math.floor(hash(index, 7) * 14),
        ink,
      });
    }
  };
  const centreY = state.player.y - 9;
  for (const event of events) {
    if (event.type === "token") burst(event.x, event.y, 5, "accent");
    if (event.type === "power") burst(PLAYER_X + 7, centreY, 12, "accent", 1.4);
    if (event.type === "shield-break")
      burst(PLAYER_X + 7, centreY, 16, "muted", 1.8);
    if (event.type === "double-jump")
      burst(PLAYER_X + 7, state.player.y, 6, "muted");
    if (event.type === "crash") {
      burst(PLAYER_X + 7, centreY, 24, "ink", 2.2);
      burst(PLAYER_X + 7, centreY, 10, "accent", 1.6);
      effects.shake = 12;
    }
  }
}

/** Moves the sparks on by `steps` (a share of an engine step: screens vary). */
export function age(effects: Effects, steps: number): void {
  for (const particle of effects.particles) {
    particle.x += particle.vx * steps;
    particle.y += particle.vy * steps;
    particle.vy += 0.12 * steps;
    particle.life -= steps;
  }
  effects.particles = effects.particles.filter((particle) => particle.life > 0);
  effects.shake = Math.max(0, effects.shake - steps);
}

/** Sprites drawn once per palette and scale, then copied. */
export class SpriteBook {
  private key: string;
  private cache = new Map<Sprite, HTMLCanvasElement>();
  /** Screen pixels per course pixel. */
  scale = 1;

  constructor(private palette: Palette) {
    this.key = paletteKey(palette);
  }

  setPalette(palette: Palette): void {
    const key = paletteKey(palette);
    if (key === this.key) return;
    this.key = key;
    this.palette = palette;
    this.cache.clear();
  }

  setScale(scale: number): void {
    if (scale === this.scale) return;
    this.scale = scale;
    this.cache.clear();
  }

  get colours(): Palette {
    return this.palette;
  }

  /**
   * The sprite at this scale. Each course pixel covers the screen pixels between
   * its rounded edges, so at 2.5× they alternate 2 and 3 wide, but the pattern is
   * fixed: it doesn't shimmer as the sprite moves.
   */
  get(sprite: Sprite): HTMLCanvasElement | null {
    const cached = this.cache.get(sprite);
    if (cached) return cached;
    const k = this.scale;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(spriteWidth(sprite) * k));
    canvas.height = Math.max(1, Math.round(sprite.length * k));
    const context = canvas.getContext("2d");
    if (!context) return null;
    sprite.forEach((row, y) => {
      const top = Math.round(y * k);
      const bottom = Math.round((y + 1) * k);
      for (let x = 0; x < row.length; x++) {
        const ink = SPRITE_INKS[row.charAt(x)];
        if (!ink) continue;
        const left = Math.round(x * k);
        context.fillStyle = this.palette[ink];
        context.fillRect(
          left,
          top,
          Math.round((x + 1) * k) - left,
          bottom - top,
        );
      }
    });
    this.cache.set(sprite, canvas);
    return canvas;
  }
}

export interface DrawOptions {
  book: SpriteBook;
  effects: Effects;
  reduced: boolean;
  /** What the robot wears. */
  accessory?: AccessoryId | null;
}

/** Draws in course pixels, snapped to screen pixels. */
class Painter {
  /** A shake, in course pixels. */
  dx = 0;
  dy = 0;

  constructor(
    readonly context: CanvasRenderingContext2D,
    readonly book: SpriteBook,
  ) {}

  private px(value: number): number {
    return Math.round(value * this.book.scale);
  }

  rect(colour: string, x: number, y: number, w: number, h: number): void {
    const left = this.px(x + this.dx);
    const top = this.px(y + this.dy);
    const width = Math.max(1, this.px(x + this.dx + w) - left);
    const height = Math.max(1, this.px(y + this.dy + h) - top);
    this.context.fillStyle = colour;
    this.context.fillRect(left, top, width, height);
  }

  blit(sprite: Sprite, x: number, y: number): void {
    const image = this.book.get(sprite);
    if (image) {
      this.context.drawImage(image, this.px(x + this.dx), this.px(y + this.dy));
    }
  }
}

/** Scenery that scrolls past at `rate` of the running speed, in tiles of `size`. */
function tiles(
  offset: number,
  size: number,
  draw: (x: number, tile: number) => void,
): void {
  const first = Math.floor(offset / size);
  for (let tile = first; tile * size - offset < VIEW_W; tile++) {
    draw(tile * size - offset, tile);
  }
}

function background(
  paint: Painter,
  biome: BiomeId,
  state: RunState,
  { book, reduced }: DrawOptions,
): void {
  const { hair, accent } = book.colours;
  const far = reduced ? 0 : state.distance * 0.25;
  const blink = reduced ? 0 : Math.floor(state.frame / 20);

  switch (biome) {
    case "terminal":
      // Lines of code on a far-off screen.
      tiles(far, 96, (x, tile) => {
        for (let row = 0; row < 9; row++) {
          const indent = Math.floor(hash(tile, row) * 4) * 6;
          const width = 12 + Math.floor(hash(row, tile) * 60);
          if (hash(tile * 7, row) < 0.25) continue;
          paint.rect(hair, x + indent, 14 + row * 11, width, 2);
        }
      });
      break;
    case "server-room":
    case "production":
      // Racks, with lights.
      tiles(far, 64, (x, tile) => {
        const top = GROUND_Y - 92;
        paint.rect(hair, x, top, 38, 1);
        paint.rect(hair, x, top, 1, 92);
        paint.rect(hair, x + 37, top, 1, 92);
        for (let slot = 0; slot < 10; slot++) {
          paint.rect(hair, x + 4, top + 6 + slot * 9, 30, 1);
          const on = hash(tile, slot + blink * 31) < 0.3;
          if (on) paint.rect(accent, x + 30, top + 3 + slot * 9, 2, 2);
        }
      });
      if (biome === "production") {
        tiles(reduced ? 0 : state.distance * 0.5, 40, (x, tile) => {
          if (hash(tile, 3) < 0.5) return;
          const frame = reduced
            ? 0
            : Math.floor((state.frame + tile * 5) / 8) % 2;
          paint.blit(frame ? FLAME_B : FLAME_A, x + 10, GROUND_Y - 7);
        });
      }
      break;
    case "cloud":
      tiles(far, 120, (x, tile) => {
        paint.blit(CLOUD, x + hash(tile) * 60, 14 + hash(tile, 1) * 40);
      });
      tiles(reduced ? 0 : state.distance * 0.5, 170, (x, tile) => {
        paint.blit(CLOUD, x + hash(tile, 2) * 80, 50 + hash(tile, 3) * 30);
      });
      break;
  }
}

/** How far into a new biome its scenery takes to fade in over the last one's. */
export const SCENE_FADE_METRES = 90;

/**
 * The scenery to draw, and how strongly: one biome, or two crossfading just after a
 * boundary (eased, so it starts and ends gently).
 */
export function sceneLayers(
  distance: number,
): { biome: BiomeId; alpha: number }[] {
  const metres = distance / PIXELS_PER_METRE;
  let index = 0;
  BIOMES.forEach((biome, at) => {
    if (metres >= biome.fromMetres) index = at;
  });
  const current = BIOMES[index];
  const previous = BIOMES[index - 1];
  if (!current) return [];
  const t = Math.min(1, (metres - current.fromMetres) / SCENE_FADE_METRES);
  if (!previous || t >= 1) return [{ biome: current.id, alpha: 1 }];
  const eased = t * t * (3 - 2 * t);
  return [
    { biome: previous.id, alpha: 1 - eased },
    { biome: current.id, alpha: eased },
  ];
}

function ground(
  paint: Painter,
  state: RunState,
  { book }: DrawOptions,
  layers: readonly { biome: BiomeId; alpha: number }[],
): void {
  const { ink, muted, accent, paper } = book.colours;
  const gaps = state.obstacles.filter((obstacle) => obstacle.kind === "gap");

  const hazard = layers.find((layer) => layer.biome === "production");
  if (hazard) {
    // Hazard stripes under the line, fading in with Production's scenery.
    paint.context.globalAlpha = hazard.alpha;
    tiles(state.distance, 16, (x) => {
      paint.rect(accent, x, GROUND_Y + 2, 8, 3);
    });
    paint.context.globalAlpha = 1;
  }
  // The floor's grit, scrolling with the course.
  tiles(state.distance, 12, (x, tile) => {
    const r = hash(tile, 11);
    if (r < 0.35)
      paint.rect(
        muted,
        x + r * 10,
        GROUND_Y + 4 + hash(tile) * 14,
        1 + Math.floor(r * 3),
        1,
      );
  });
  paint.rect(ink, 0, GROUND_Y, VIEW_W, 1);

  for (const gap of gaps) {
    paint.rect(paper, gap.x, GROUND_Y, gap.w, VIEW_H - GROUND_Y);
    paint.rect(ink, gap.x, GROUND_Y, 1, 4);
    paint.rect(ink, gap.x + gap.w - 1, GROUND_Y, 1, 4);
    if (gap.w >= 20) {
      const left = gap.x + gap.w / 2 - 5;
      (["4", "0", "4"] as const).forEach((digit, index) => {
        paint.blit(DIGITS[digit], left + index * 4, GROUND_Y + 9);
      });
    }
  }
}

/** A stack trace: a block of ink with lines of "text" cut into it. */
function stack(
  paint: Painter,
  obstacle: Obstacle,
  { book }: DrawOptions,
): void {
  const { ink, paper } = book.colours;
  paint.rect(ink, obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  for (let line = 3; line < obstacle.h - 2; line += 3) {
    const width = 2 + Math.floor(hash(obstacle.id, line) * (obstacle.w - 4));
    paint.rect(paper, obstacle.x + 2, obstacle.y + line, width, 1);
  }
}

function obstacles(
  paint: Painter,
  state: RunState,
  options: DrawOptions,
): void {
  const { reduced } = options;
  const flap = reduced ? 0 : Math.floor(state.frame / 3) % 2;
  const scuttle = reduced ? 0 : Math.floor(state.frame / 6) % 2;
  for (const obstacle of state.obstacles) {
    if (obstacle.kind === "gap") continue;
    paint.context.globalAlpha = obstacle.hit ? 0.4 : 1;
    if (obstacle.kind === "stack") stack(paint, obstacle, options);
    if (obstacle.kind === "bug")
      paint.blit(scuttle ? BUG_B : BUG_A, obstacle.x, obstacle.y);
    if (obstacle.kind === "drone")
      paint.blit(flap ? DRONE_B : DRONE_A, obstacle.x, obstacle.y);
    paint.context.globalAlpha = 1;
  }
}

const POWER_SPRITES = {
  compact: POWER_COMPACT,
  shield: POWER_SHIELD,
  magnet: POWER_MAGNET,
} as const;

function pickups(
  paint: Painter,
  state: RunState,
  { reduced }: DrawOptions,
): void {
  for (const pickup of state.pickups) {
    if (pickup.kind === "token") {
      paint.blit(TOKEN, pickup.x - 3, pickup.y - 3);
      continue;
    }
    const bob = reduced
      ? 0
      : Math.round(Math.sin((state.frame + pickup.id * 9) / 10) * 2);
    paint.blit(POWER_SPRITES[pickup.kind], pickup.x - 6, pickup.y - 6 + bob);
  }
}

function robot(
  paint: Painter,
  state: RunState,
  { book, reduced, accessory }: DrawOptions,
): void {
  const { player, powers } = state;
  if (!reduced && player.safe > 0 && Math.floor(player.safe / 4) % 2 === 0)
    return;
  const sprite = !state.alive
    ? ROBOT_CRASH
    : player.sliding
      ? ROBOT_SLIDE
      : !player.onGround
        ? ROBOT_JUMP
        : Math.floor(state.distance / 14) % 2
          ? ROBOT_RUN_B
          : ROBOT_RUN_A;
  paint.blit(sprite, PLAYER_X - 1, player.y - sprite.length);
  if (accessory) {
    // The head's top-left corner: further forward and lower when sliding.
    const art = ACCESSORY_ART[accessory];
    const headX = sprite === ROBOT_SLIDE ? PLAYER_X + 9 : PLAYER_X + 1;
    const headY = player.y - sprite.length;
    paint.blit(art.sprite, headX + art.dx, headY + art.dy);
  }

  if (powers.shield && state.alive) {
    // A dotted ring around the robot.
    const cx = PLAYER_X + 7;
    const cy = player.y - (player.sliding ? 5 : 9);
    const spin = reduced ? 0 : state.frame / 30;
    for (let dot = 0; dot < 16; dot++) {
      const angle = spin + (dot / 16) * Math.PI * 2;
      paint.rect(
        book.colours.accent,
        cx + Math.cos(angle) * 14,
        cy + Math.sin(angle) * 13,
        1,
        1,
      );
    }
  }
}

function particles(paint: Painter, effects: Effects, book: SpriteBook): void {
  for (const particle of effects.particles) {
    paint.rect(book.colours[particle.ink], particle.x, particle.y, 1, 1);
  }
}

/**
 * Draws one picture of the run onto a canvas `book.scale` times the course's size
 * (set the scale from the canvas's width first).
 */
export function drawScene(
  context: CanvasRenderingContext2D,
  state: RunState,
  options: DrawOptions,
): void {
  const { book, effects, reduced } = options;
  const { paper, accent } = book.colours;
  const paint = new Painter(context, book);
  paint.rect(paper, 0, 0, VIEW_W, VIEW_H);
  if (!reduced && effects.shake > 0) {
    const shake = Math.ceil(effects.shake);
    paint.dx = Math.round((hash(state.frame, shake) - 0.5) * shake * 0.5);
    paint.dy = Math.round((hash(shake, 5) - 0.5) * shake * 0.4);
  }
  const layers = sceneLayers(state.distance);
  for (const layer of layers) {
    paint.context.globalAlpha = layer.alpha;
    background(paint, layer.biome, state, options);
  }
  paint.context.globalAlpha = 1;
  ground(paint, state, options, layers);
  pickups(paint, state, options);
  obstacles(paint, state, options);
  robot(paint, state, options);
  particles(paint, effects, book);
  paint.dx = 0;
  paint.dy = 0;

  if (state.powers.compact > 0) {
    // Slow motion: a thin accent frame.
    paint.rect(accent, 0, 0, VIEW_W, 1);
    paint.rect(accent, 0, VIEW_H - 1, VIEW_W, 1);
  }
}
