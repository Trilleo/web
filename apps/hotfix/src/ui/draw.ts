import {
  GROUND_Y,
  PLAYER_X,
  VIEW_H,
  VIEW_W,
  type BiomeId,
  type Obstacle,
  type RunEvent,
  type RunState,
} from "../core";
import { paletteKey, type Palette } from "./palette";
import {
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
 * Draws a run at course size (VIEW_W × VIEW_H, one canvas pixel per course pixel).
 * The screen scales that up without smoothing, so pixels stay square. Nothing here
 * changes the run: scenery and sparks come from hashes and the step count.
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

/** Moves the sparks on by one frame of drawing. */
export function age(effects: Effects): void {
  for (const particle of effects.particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.12;
    particle.life--;
  }
  effects.particles = effects.particles.filter((particle) => particle.life > 0);
  if (effects.shake > 0) effects.shake--;
}

/** Sprites drawn once per palette, then copied. */
export class SpriteBook {
  private key = "";
  private cache = new Map<Sprite, HTMLCanvasElement>();

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

  get colours(): Palette {
    return this.palette;
  }

  get(sprite: Sprite): HTMLCanvasElement | null {
    const cached = this.cache.get(sprite);
    if (cached) return cached;
    const canvas = document.createElement("canvas");
    canvas.width = spriteWidth(sprite);
    canvas.height = sprite.length;
    const context = canvas.getContext("2d");
    if (!context) return null;
    sprite.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ink = SPRITE_INKS[row.charAt(x)];
        if (!ink) continue;
        context.fillStyle = this.palette[ink];
        context.fillRect(x, y, 1, 1);
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
}

function blit(
  context: CanvasRenderingContext2D,
  book: SpriteBook,
  sprite: Sprite,
  x: number,
  y: number,
): void {
  const image = book.get(sprite);
  if (image) context.drawImage(image, Math.round(x), Math.round(y));
}

function rect(
  context: CanvasRenderingContext2D,
  colour: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  context.fillStyle = colour;
  context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
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
  context: CanvasRenderingContext2D,
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
          rect(context, hair, x + indent, 14 + row * 11, width, 2);
        }
      });
      break;
    case "server-room":
    case "production":
      // Racks, with lights.
      tiles(far, 64, (x, tile) => {
        const top = GROUND_Y - 92;
        context.strokeStyle = hair;
        context.lineWidth = 1;
        context.strokeRect(Math.round(x) + 0.5, top + 0.5, 38, 92);
        for (let slot = 0; slot < 10; slot++) {
          rect(context, hair, x + 4, top + 6 + slot * 9, 30, 1);
          const on = hash(tile, slot + blink * 31) < 0.3;
          if (on) rect(context, accent, x + 30, top + 3 + slot * 9, 2, 2);
        }
      });
      if (biome === "production") {
        tiles(reduced ? 0 : state.distance * 0.5, 40, (x, tile) => {
          if (hash(tile, 3) < 0.5) return;
          const frame = reduced
            ? 0
            : Math.floor((state.frame + tile * 5) / 8) % 2;
          blit(context, book, frame ? FLAME_B : FLAME_A, x + 10, GROUND_Y - 7);
        });
      }
      break;
    case "cloud":
      tiles(far, 120, (x, tile) => {
        blit(
          context,
          book,
          CLOUD,
          x + hash(tile) * 60,
          14 + hash(tile, 1) * 40,
        );
      });
      tiles(reduced ? 0 : state.distance * 0.5, 170, (x, tile) => {
        blit(
          context,
          book,
          CLOUD,
          x + hash(tile, 2) * 80,
          50 + hash(tile, 3) * 30,
        );
      });
      break;
  }
}

function ground(
  context: CanvasRenderingContext2D,
  state: RunState,
  { book }: DrawOptions,
): void {
  const { ink, muted, accent, paper } = book.colours;
  const gaps = state.obstacles.filter((obstacle) => obstacle.kind === "gap");

  if (state.biome === "production") {
    // Hazard stripes under the line.
    tiles(state.distance, 16, (x) => {
      rect(context, accent, x, GROUND_Y + 2, 8, 3);
    });
  }
  // The floor's grit, scrolling with the course.
  tiles(state.distance, 12, (x, tile) => {
    const r = hash(tile, 11);
    if (r < 0.35)
      rect(
        context,
        muted,
        x + r * 10,
        GROUND_Y + 4 + hash(tile) * 14,
        1 + Math.floor(r * 3),
        1,
      );
  });
  rect(context, ink, 0, GROUND_Y, VIEW_W, 1);

  for (const gap of gaps) {
    rect(context, paper, gap.x, GROUND_Y, gap.w, VIEW_H - GROUND_Y);
    rect(context, ink, gap.x, GROUND_Y, 1, 4);
    rect(context, ink, gap.x + gap.w - 1, GROUND_Y, 1, 4);
    if (gap.w >= 20) {
      const left = gap.x + gap.w / 2 - 5;
      (["4", "0", "4"] as const).forEach((digit, index) => {
        blit(context, book, DIGITS[digit], left + index * 4, GROUND_Y + 9);
      });
    }
  }
}

/** A stack trace: a block of ink with lines of "text" cut into it. */
function stack(
  context: CanvasRenderingContext2D,
  obstacle: Obstacle,
  { book }: DrawOptions,
): void {
  const { ink, paper } = book.colours;
  rect(context, ink, obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  for (let line = 3; line < obstacle.h - 2; line += 3) {
    const width = 2 + Math.floor(hash(obstacle.id, line) * (obstacle.w - 4));
    rect(context, paper, obstacle.x + 2, obstacle.y + line, width, 1);
  }
}

function obstacles(
  context: CanvasRenderingContext2D,
  state: RunState,
  options: DrawOptions,
): void {
  const { book, reduced } = options;
  const flap = reduced ? 0 : Math.floor(state.frame / 3) % 2;
  const scuttle = reduced ? 0 : Math.floor(state.frame / 6) % 2;
  for (const obstacle of state.obstacles) {
    if (obstacle.kind === "gap") continue;
    context.globalAlpha = obstacle.hit ? 0.4 : 1;
    if (obstacle.kind === "stack") stack(context, obstacle, options);
    if (obstacle.kind === "bug")
      blit(context, book, scuttle ? BUG_B : BUG_A, obstacle.x, obstacle.y);
    if (obstacle.kind === "drone")
      blit(context, book, flap ? DRONE_B : DRONE_A, obstacle.x, obstacle.y);
    context.globalAlpha = 1;
  }
}

const POWER_SPRITES = {
  compact: POWER_COMPACT,
  shield: POWER_SHIELD,
  magnet: POWER_MAGNET,
} as const;

function pickups(
  context: CanvasRenderingContext2D,
  state: RunState,
  { book, reduced }: DrawOptions,
): void {
  for (const pickup of state.pickups) {
    if (pickup.kind === "token") {
      blit(context, book, TOKEN, pickup.x - 3, pickup.y - 3);
      continue;
    }
    const bob = reduced
      ? 0
      : Math.round(Math.sin((state.frame + pickup.id * 9) / 10) * 2);
    blit(
      context,
      book,
      POWER_SPRITES[pickup.kind],
      pickup.x - 6,
      pickup.y - 6 + bob,
    );
  }
}

function robot(
  context: CanvasRenderingContext2D,
  state: RunState,
  { book, reduced }: DrawOptions,
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
  blit(context, book, sprite, PLAYER_X - 1, player.y - sprite.length);

  if (powers.shield && state.alive) {
    // A dotted ring around the robot.
    const cx = PLAYER_X + 7;
    const cy = player.y - (player.sliding ? 5 : 9);
    const spin = reduced ? 0 : state.frame / 30;
    context.fillStyle = book.colours.accent;
    for (let dot = 0; dot < 16; dot++) {
      const angle = spin + (dot / 16) * Math.PI * 2;
      context.fillRect(
        Math.round(cx + Math.cos(angle) * 14),
        Math.round(cy + Math.sin(angle) * 13),
        1,
        1,
      );
    }
  }
}

function particles(
  context: CanvasRenderingContext2D,
  effects: Effects,
  book: SpriteBook,
): void {
  for (const particle of effects.particles) {
    rect(context, book.colours[particle.ink], particle.x, particle.y, 1, 1);
  }
}

/** Draws one picture of the run onto a VIEW_W × VIEW_H context. */
export function drawScene(
  context: CanvasRenderingContext2D,
  state: RunState,
  options: DrawOptions,
): void {
  const { book, effects, reduced } = options;
  const { paper, accent } = book.colours;
  context.save();
  rect(context, paper, 0, 0, VIEW_W, VIEW_H);
  if (!reduced && effects.shake > 0) {
    context.translate(
      Math.round(
        (hash(state.frame, effects.shake) - 0.5) * effects.shake * 0.5,
      ),
      Math.round((hash(effects.shake, 5) - 0.5) * effects.shake * 0.4),
    );
  }
  background(context, state.biome, state, options);
  ground(context, state, options);
  pickups(context, state, options);
  obstacles(context, state, options);
  robot(context, state, options);
  particles(context, effects, book);
  context.restore();

  if (state.powers.compact > 0) {
    // Slow motion: a thin accent frame.
    rect(context, accent, 0, 0, VIEW_W, 1);
    rect(context, accent, 0, VIEW_H - 1, VIEW_W, 1);
  }
}
