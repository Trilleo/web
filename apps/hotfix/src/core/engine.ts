import {
  ACCEL,
  BUG_SPEED,
  COMPACT_FACTOR,
  COMPACT_FRAMES,
  COYOTE,
  DOUBLE_JUMP_V,
  DT,
  FAST_FALL,
  GRAVITY,
  GROUND_Y,
  JUMP_BUFFER,
  JUMP_CUT,
  JUMP_V,
  MAGNET_FRAMES,
  MAGNET_RANGE,
  MILESTONE_METRES,
  PIT_DEPTH,
  PIXELS_PER_METRE,
  PLAYER_H,
  PLAYER_W,
  PLAYER_X,
  POWER_EVERY,
  RULES_VERSION,
  RUNWAY,
  SHIELD_BOUNCE_V,
  SHIELD_SAFE_FRAMES,
  SLIDE_H,
  SLIDE_W,
  SPEED_MAX,
  SPEED_START,
  TOKEN_POINTS,
  VIEW_W,
  biomeAt,
  nextPattern,
  powerPattern,
  spacing,
  type Pattern,
} from "./content";
import { random } from "./rng";
import type {
  CrashCause,
  Input,
  LoggedInput,
  RunEvent,
  RunState,
} from "./types";

/*
 * The rules. Pure arithmetic on numbers (no Math.sin, no clocks), one fixed step at
 * a time, so the same seed and inputs give the same run on any machine: the server
 * can replay a run to check its score. Functions here change the state in place.
 */

/** A seed from anything: run seeds are unsigned 32-bit numbers. */
export function seedFrom(value: number): number {
  return value >>> 0;
}

export function newRun(seed: number): RunState {
  const rng = { seed: seedFrom(seed) };
  const powerIn =
    POWER_EVERY[0] / 2 + random(rng) * (POWER_EVERY[1] - POWER_EVERY[0]);
  return {
    v: RULES_VERSION,
    seed: rng.seed,
    frame: 0,
    distance: 0,
    speed: SPEED_START,
    tokens: 0,
    alive: true,
    cause: null,
    biome: "terminal",
    player: {
      y: GROUND_Y,
      vy: 0,
      onGround: true,
      sliding: false,
      airJumps: 1,
      jumpBuffer: 0,
      coyote: 0,
      safe: 0,
    },
    powers: { compact: 0, magnet: 0, shield: false },
    held: { jump: false, down: false },
    obstacles: [],
    pickups: [],
    spawnIn: RUNWAY,
    powerIn,
    nextId: 1,
    stats: {
      jumps: 0,
      doubleJumps: 0,
      slides: 0,
      powers: 0,
      shields: 0,
      cleared: 0,
    },
    events: [],
  };
}

export function metres(state: RunState): number {
  return Math.floor(state.distance / PIXELS_PER_METRE);
}

/** Distance plus tokens. */
export function score(state: RunState): number {
  return metres(state) + state.tokens * TOKEN_POINTS;
}

/** A key went down or up. Takes effect on the next step. */
export function press(state: RunState, input: Input): void {
  switch (input) {
    case "jump":
      if (!state.held.jump) state.player.jumpBuffer = JUMP_BUFFER;
      state.held.jump = true;
      break;
    case "jump-end":
      state.held.jump = false;
      break;
    case "down":
      state.held.down = true;
      break;
    case "down-end":
      state.held.down = false;
      break;
  }
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the robot is: shorter and longer while sliding. */
export function playerBox(state: RunState): Box {
  const { player } = state;
  return player.sliding
    ? { x: PLAYER_X, y: player.y - SLIDE_H, w: SLIDE_W, h: SLIDE_H }
    : { x: PLAYER_X, y: player.y - PLAYER_H, w: PLAYER_W, h: PLAYER_H };
}

function inset(box: Box, by: number): Box {
  return {
    x: box.x + by,
    y: box.y + by,
    w: box.w - by * 2,
    h: box.h - by * 2,
  };
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

/** Whether the robot's feet are all over a hole (a toe on the edge still holds). */
function overGap(state: RunState): boolean {
  const left = PLAYER_X + 3;
  const right = PLAYER_X + PLAYER_W - 3;
  return state.obstacles.some(
    (gap) => gap.kind === "gap" && gap.x <= left && right <= gap.x + gap.w,
  );
}

/** Whether the run has ended (a function: TypeScript would keep an earlier check). */
function crashed(state: RunState): boolean {
  return !state.alive;
}

function crash(state: RunState, cause: CrashCause): void {
  state.alive = false;
  state.cause = cause;
  state.held = { jump: false, down: false };
  state.events.push({ type: "crash", cause });
}

/** The shield takes the hit: true if there was one. */
function shieldTakes(state: RunState): boolean {
  if (!state.powers.shield) return false;
  state.powers.shield = false;
  state.player.safe = SHIELD_SAFE_FRAMES;
  state.events.push({ type: "shield-break" });
  return true;
}

function movePlayer(state: RunState): void {
  const { player, held } = state;
  const inPit = player.y > GROUND_Y + 1;

  if (player.jumpBuffer > 0) player.jumpBuffer--;
  if (player.coyote > 0) player.coyote--;

  if (player.jumpBuffer > 0 && !inPit) {
    if (player.onGround || player.coyote > 0) {
      player.vy = JUMP_V;
      player.onGround = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      state.stats.jumps++;
      state.events.push({ type: "jump" });
    } else if (player.airJumps > 0) {
      player.vy = DOUBLE_JUMP_V;
      player.airJumps--;
      player.jumpBuffer = 0;
      state.stats.doubleJumps++;
      state.events.push({ type: "double-jump" });
    }
  }

  const wasSliding = player.sliding;
  player.sliding = player.onGround && held.down;
  if (player.sliding && !wasSliding) state.stats.slides++;

  if (player.onGround) {
    if (overGap(state)) {
      player.onGround = false;
      player.coyote = COYOTE;
      player.vy = 0;
    } else {
      return;
    }
  }

  // Letting go early makes a short hop.
  if (!held.jump && player.vy < JUMP_CUT) player.vy = JUMP_CUT;
  player.vy += GRAVITY * (held.down ? FAST_FALL : 1) * DT;
  const before = player.y;
  player.y += player.vy * DT;

  const over = overGap(state);
  if (player.vy >= 0 && before <= GROUND_Y && player.y >= GROUND_Y && !over) {
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
    player.airJumps = 1;
    player.sliding = held.down;
    state.events.push({ type: "land" });
    return;
  }
  if (player.y > GROUND_Y) {
    if (!over) {
      // Climbing out of a hole is fine; falling into its far wall isn't.
      if (player.vy < 0) {
        player.y = GROUND_Y;
        return;
      }
      if (!shieldTakes(state)) crash(state, "gap");
      else bounce(state);
      return;
    }
    if (player.y > GROUND_Y + PIT_DEPTH) {
      if (shieldTakes(state)) bounce(state);
      else crash(state, "gap");
    }
  }
}

function bounce(state: RunState): void {
  state.player.vy = SHIELD_BOUNCE_V;
  state.player.y = Math.min(state.player.y, GROUND_Y + PIT_DEPTH);
  state.player.airJumps = 1;
}

function place(state: RunState, pattern: Pattern, x: number): void {
  for (const piece of pattern.pieces) {
    const id = state.nextId++;
    if (!("w" in piece)) {
      state.pickups.push({
        id,
        kind: piece.kind,
        x: x + piece.dx,
        y: GROUND_Y - piece.lift - 4,
      });
      continue;
    }
    const top =
      piece.kind === "drone"
        ? GROUND_Y - (piece.lift ?? 0) - piece.h
        : piece.kind === "gap"
          ? GROUND_Y
          : GROUND_Y - piece.h;
    state.obstacles.push({
      id,
      kind: piece.kind,
      x: x + piece.dx,
      y: top,
      w: piece.w,
      h: piece.h,
      hit: false,
      passed: false,
    });
  }
}

function spawn(state: RunState): void {
  const rng = state;
  const x = VIEW_W + 16;
  let pattern: Pattern;
  if (state.powerIn <= 0) {
    pattern = powerPattern(rng);
    state.powerIn =
      POWER_EVERY[0] + random(rng) * (POWER_EVERY[1] - POWER_EVERY[0]);
  } else {
    pattern = nextPattern(rng, biomeAt(metres(state)), state.speed);
  }
  place(state, pattern, x);
  state.spawnIn += pattern.length + spacing(rng, state.speed);
}

function collide(state: RunState): void {
  const body = inset(playerBox(state), 2);
  for (const obstacle of state.obstacles) {
    if (obstacle.kind === "gap" || obstacle.hit) continue;
    if (!overlaps(body, inset(obstacle, 1))) continue;
    if (state.player.safe > 0) continue;
    if (shieldTakes(state)) {
      obstacle.hit = true;
      state.stats.shields++;
      continue;
    }
    crash(state, obstacle.kind);
    return;
  }

  const reach = { x: body.x - 2, y: body.y - 2, w: body.w + 4, h: body.h + 4 };
  state.pickups = state.pickups.filter((pickup) => {
    const box = { x: pickup.x - 4, y: pickup.y - 4, w: 8, h: 8 };
    if (!overlaps(reach, box)) return true;
    if (pickup.kind === "token") {
      state.tokens++;
      state.events.push({ type: "token", x: pickup.x, y: pickup.y });
    } else {
      if (pickup.kind === "compact") state.powers.compact = COMPACT_FRAMES;
      if (pickup.kind === "magnet") state.powers.magnet = MAGNET_FRAMES;
      if (pickup.kind === "shield") state.powers.shield = true;
      state.stats.powers++;
      state.events.push({ type: "power", kind: pickup.kind });
    }
    return false;
  });
}

/** Moves a token a fixed share of the way to the robot. */
function pull(state: RunState): void {
  const box = playerBox(state);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  for (const pickup of state.pickups) {
    if (pickup.kind !== "token") continue;
    const dx = cx - pickup.x;
    const dy = cy - pickup.y;
    if (dx > MAGNET_RANGE || dx < -MAGNET_RANGE / 2) continue;
    pickup.x += dx * 0.18;
    pickup.y += dy * 0.18;
  }
}

/** One step: 1/60 of a second. Does nothing once the run has crashed. */
export function step(state: RunState): void {
  state.events = [];
  if (!state.alive) return;
  state.frame++;

  const { player, powers } = state;
  if (powers.compact > 0) powers.compact--;
  if (powers.magnet > 0) powers.magnet--;
  if (player.safe > 0) player.safe--;

  const before = metres(state);
  state.speed = Math.min(SPEED_MAX, state.speed + ACCEL * DT);
  const travel = state.speed * (powers.compact > 0 ? COMPACT_FACTOR : 1) * DT;
  state.distance += travel;
  const after = metres(state);

  const biome = biomeAt(after);
  if (biome.id !== state.biome) {
    state.biome = biome.id;
    state.events.push({ type: "biome", biome: biome.id });
  }
  if (
    Math.floor(after / MILESTONE_METRES) > Math.floor(before / MILESTONE_METRES)
  ) {
    state.events.push({
      type: "milestone",
      metres: Math.floor(after / MILESTONE_METRES) * MILESTONE_METRES,
    });
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= travel;
    if (obstacle.kind === "bug" && !obstacle.hit) obstacle.x -= BUG_SPEED * DT;
    if (obstacle.hit) obstacle.y -= 3;
  }
  for (const pickup of state.pickups) pickup.x -= travel;
  state.obstacles = state.obstacles.filter(
    (obstacle) => obstacle.x + obstacle.w > -24 && obstacle.y > -40,
  );
  state.pickups = state.pickups.filter((pickup) => pickup.x > -24);

  movePlayer(state);
  if (crashed(state)) return;
  if (powers.magnet > 0) pull(state);

  state.spawnIn -= travel;
  state.powerIn -= travel;
  if (state.spawnIn <= 0) spawn(state);

  collide(state);
  if (crashed(state)) return;
  for (const obstacle of state.obstacles) {
    if (
      !obstacle.passed &&
      !obstacle.hit &&
      obstacle.x + obstacle.w < PLAYER_X
    ) {
      obstacle.passed = true;
      state.stats.cleared++;
    }
  }
}

/** What a run looks like after `inputs`, played from `seed` for `frames` steps. */
export function replay(
  seed: number,
  inputs: readonly LoggedInput[],
  frames: number,
): RunState {
  const state = newRun(seed);
  let next = 0;
  while (state.alive && state.frame < frames) {
    while (
      next < inputs.length &&
      (inputs[next]?.f ?? Infinity) <= state.frame
    ) {
      const input = inputs[next];
      if (input) press(state, input.i);
      next++;
    }
    step(state);
  }
  return state;
}

/** Copies of the events a step produced, by type. */
export function eventsOf<T extends RunEvent["type"]>(
  state: RunState,
  type: T,
): Extract<RunEvent, { type: T }>[] {
  return state.events.filter(
    (event): event is Extract<RunEvent, { type: T }> => event.type === type,
  );
}
