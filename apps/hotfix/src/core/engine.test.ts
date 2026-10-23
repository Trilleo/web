import { describe, expect, it } from "vitest";
import { autoplay } from "./autopilot";
import {
  BIOMES,
  BUG_H,
  BUG_W,
  COMPACT_FACTOR,
  DRONE_H,
  DRONE_LIFT,
  DRONE_W,
  FPS,
  GROUND_Y,
  PLAYER_X,
  SPEED_START,
  STACK_W,
  TOKEN_POINTS,
  VIEW_H,
  biomeAt,
  buildPattern,
  type PatternId,
} from "./content";
import { metres, newRun, press, replay, score, step } from "./engine";
import type { Input, ObstacleKind, RunState } from "./types";

/** A run with nothing coming, to set things up by hand. */
function emptyRun(): RunState {
  const state = newRun(1);
  state.spawnIn = Infinity;
  state.powerIn = Infinity;
  return state;
}

function add(
  state: RunState,
  kind: ObstacleKind,
  x: number,
  shape: { w: number; h: number; lift?: number },
): void {
  const y =
    kind === "drone"
      ? GROUND_Y - (shape.lift ?? 0) - shape.h
      : kind === "gap"
        ? GROUND_Y
        : GROUND_Y - shape.h;
  state.obstacles.push({
    id: state.nextId++,
    kind,
    x,
    y,
    ...shape,
    hit: false,
    passed: false,
  });
}

function run(state: RunState, frames: number, inputs: [number, Input][] = []) {
  const start = state.frame;
  while (state.alive && state.frame - start < frames) {
    for (const [at, input] of inputs)
      if (at === state.frame - start) press(state, input);
    step(state);
  }
  return state;
}

/** The highest the feet got over `frames` steps. */
function peak(inputs: [number, Input][]): number {
  const state = emptyRun();
  let top = GROUND_Y;
  for (let frame = 0; frame < 60; frame++) {
    for (const [at, input] of inputs) if (at === frame) press(state, input);
    step(state);
    top = Math.min(top, state.player.y);
  }
  return GROUND_Y - top;
}

describe("running", () => {
  it("starts on the ground in the terminal, and speeds up", () => {
    const state = newRun(7);
    expect(state.player.onGround).toBe(true);
    expect(state.biome).toBe("terminal");
    run(state, FPS);
    expect(state.speed).toBeGreaterThan(SPEED_START);
    expect(metres(state)).toBe(Math.floor(state.distance / 10));
  });

  it("scores metres plus tokens", () => {
    const state = emptyRun();
    run(state, FPS * 2);
    state.tokens = 3;
    expect(score(state)).toBe(metres(state) + 3 * TOKEN_POINTS);
  });

  it("builds the same course from the same seed, and another from another", () => {
    const a = run(newRun(42), FPS * 10);
    const b = run(newRun(42), FPS * 10);
    const c = run(newRun(43), FPS * 10);
    expect(a).toEqual(b);
    expect(a.obstacles).not.toEqual(c.obstacles);
  });
});

describe("jumping", () => {
  it("jumps higher the longer the key is held", () => {
    const hop = peak([
      [0, "jump"],
      [1, "jump-end"],
    ]);
    const full = peak([
      [0, "jump"],
      [40, "jump-end"],
    ]);
    expect(hop).toBeGreaterThan(BUG_H);
    expect(hop).toBeLessThan(DRONE_LIFT.high - 18);
    expect(full).toBeGreaterThan(60);
  });

  it("jumps once more in the air, but not twice", () => {
    const single = peak([
      [0, "jump"],
      [40, "jump-end"],
    ]);
    const double = peak([
      [0, "jump"],
      [20, "jump-end"],
      [22, "jump"],
      [50, "jump-end"],
    ]);
    expect(double).toBeGreaterThan(single);

    const state = emptyRun();
    let doubles = 0;
    const inputs: [number, Input][] = [
      [0, "jump"],
      [10, "jump-end"],
      [12, "jump"],
      [14, "jump-end"],
      [16, "jump"],
    ];
    for (let frame = 0; frame < 20; frame++) {
      for (const [at, input] of inputs) if (at === frame) press(state, input);
      step(state);
      doubles += state.events.filter((e) => e.type === "double-jump").length;
    }
    expect(doubles).toBe(1);
    expect(state.player.onGround).toBe(false);
  });

  it("remembers a jump pressed just before landing", () => {
    const state = emptyRun();
    // Use up the double jump first: a press in the air would be that.
    run(state, 8, [
      [0, "jump"],
      [1, "jump-end"],
      [4, "jump"],
      [5, "jump-end"],
    ]);
    expect(state.player.airJumps).toBe(0);
    while (!(state.player.vy > 0 && state.player.y > GROUND_Y - 6)) step(state);
    press(state, "jump");
    let jumped = false;
    for (let frame = 0; frame < 10 && !jumped; frame++) {
      step(state);
      jumped = state.events.some((event) => event.type === "jump");
    }
    expect(jumped).toBe(true);
  });

  it("falls faster while down is held", () => {
    const normal = emptyRun();
    run(normal, 20, [
      [0, "jump"],
      [40, "jump-end"],
    ]);
    const fast = emptyRun();
    run(fast, 20, [
      [0, "jump"],
      [10, "jump-end"],
      [10, "down"],
    ]);
    expect(fast.player.y).toBeGreaterThan(normal.player.y);
  });
});

describe("obstacles", () => {
  it("crashes into a stack trace without jumping, and clears it with a jump", () => {
    const still = emptyRun();
    add(still, "stack", PLAYER_X + 60, { w: STACK_W, h: 20 });
    run(still, FPS);
    expect(still.alive).toBe(false);
    expect(still.cause).toBe("stack");

    const jumper = emptyRun();
    add(jumper, "stack", PLAYER_X + 60, { w: STACK_W, h: 20 });
    run(jumper, FPS * 2, [
      [2, "jump"],
      [30, "jump-end"],
    ]);
    expect(jumper.alive).toBe(true);
  });

  it("slides under a mid-height drone, which hits a robot standing up", () => {
    const shape = { w: DRONE_W, h: DRONE_H, lift: DRONE_LIFT.mid };
    const standing = emptyRun();
    add(standing, "drone", PLAYER_X + 60, shape);
    run(standing, FPS);
    expect(standing.cause).toBe("drone");

    const sliding = emptyRun();
    add(sliding, "drone", PLAYER_X + 60, shape);
    run(sliding, FPS, [[0, "down"]]);
    expect(sliding.alive).toBe(true);
    expect(sliding.player.sliding).toBe(true);
  });

  it("runs under a high drone, and a full jump hits it", () => {
    const shape = { w: DRONE_W, h: DRONE_H, lift: DRONE_LIFT.high };
    const runner = emptyRun();
    add(runner, "drone", PLAYER_X + 60, shape);
    run(runner, FPS);
    expect(runner.alive).toBe(true);

    const jumper = emptyRun();
    add(jumper, "drone", PLAYER_X + 30, shape);
    run(jumper, FPS, [
      [0, "jump"],
      [40, "jump-end"],
    ]);
    expect(jumper.cause).toBe("drone");
  });

  it("chases you: bugs scuttle towards the robot", () => {
    const state = emptyRun();
    add(state, "bug", 300, { w: BUG_W, h: BUG_H });
    const before = state.obstacles[0]?.x ?? 0;
    step(state);
    const moved = before - (state.obstacles[0]?.x ?? 0);
    expect(moved).toBeGreaterThan(state.distance);
  });

  it("falls into a gap, and jumps over one", () => {
    const faller = emptyRun();
    add(faller, "gap", PLAYER_X + 30, { w: 40, h: VIEW_H - GROUND_Y });
    run(faller, FPS);
    expect(faller.cause).toBe("gap");

    const jumper = emptyRun();
    add(jumper, "gap", PLAYER_X + 30, { w: 40, h: VIEW_H - GROUND_Y });
    run(jumper, FPS, [
      [0, "jump"],
      [20, "jump-end"],
    ]);
    expect(jumper.alive).toBe(true);
  });

  it("stops for good after a crash", () => {
    const state = emptyRun();
    add(state, "stack", PLAYER_X + 20, { w: STACK_W, h: 20 });
    run(state, FPS);
    const frame = state.frame;
    step(state);
    expect(state.frame).toBe(frame);
    expect(state.events).toEqual([]);
  });
});

describe("pickups", () => {
  function withPickup(
    kind: "token" | "compact" | "shield" | "magnet",
    x = PLAYER_X + 40,
  ) {
    const state = emptyRun();
    state.pickups.push({ id: state.nextId++, kind, x, y: GROUND_Y - 10 });
    return state;
  }

  it("collects tokens", () => {
    const state = withPickup("token");
    run(state, FPS);
    expect(state.tokens).toBe(1);
    expect(state.pickups).toEqual([]);
  });

  it("a shield takes one hit, then the next one counts", () => {
    const state = withPickup("shield", PLAYER_X + 20);
    add(state, "stack", PLAYER_X + 80, { w: STACK_W, h: 20 });
    add(state, "stack", PLAYER_X + 260, { w: STACK_W, h: 20 });
    run(state, FPS / 2);
    expect(state.powers.shield).toBe(false);
    expect(state.alive).toBe(true);
    expect(state.obstacles[0]?.hit).toBe(true);
    run(state, FPS * 2);
    expect(state.cause).toBe("stack");
  });

  it("a shield bounces you out of a gap", () => {
    const state = withPickup("shield", PLAYER_X + 10);
    add(state, "gap", PLAYER_X + 40, { w: 60, h: VIEW_H - GROUND_Y });
    run(state, FPS * 2);
    expect(state.alive).toBe(true);
    expect(state.powers.shield).toBe(false);
  });

  it("/compact slows the world down for a while", () => {
    const slow = withPickup("compact", PLAYER_X + 5);
    const normal = emptyRun();
    run(slow, 30);
    run(normal, 30);
    expect(slow.powers.compact).toBeGreaterThan(0);
    expect(slow.distance).toBeLessThan(normal.distance);
    expect(slow.distance).toBeGreaterThan(normal.distance * COMPACT_FACTOR);
  });

  it("the magnet pulls in tokens that would have been missed", () => {
    const state = withPickup("magnet", PLAYER_X + 5);
    state.pickups.push({
      id: 99,
      kind: "token",
      x: PLAYER_X + 80,
      y: GROUND_Y - 60,
    });
    run(state, FPS);
    expect(state.tokens).toBe(1);

    const without = emptyRun();
    without.pickups.push({
      id: 99,
      kind: "token",
      x: PLAYER_X + 80,
      y: GROUND_Y - 60,
    });
    run(without, FPS);
    expect(without.tokens).toBe(0);
  });
});

describe("the course", () => {
  it("goes through the biomes in order", () => {
    expect(BIOMES.map((biome) => biome.fromMetres)).toEqual(
      [...BIOMES.map((biome) => biome.fromMetres)].sort((a, b) => a - b),
    );
    expect(biomeAt(0).id).toBe("terminal");
    expect(biomeAt(999).id).toBe("terminal");
    expect(biomeAt(1000).id).toBe("server-room");
    expect(biomeAt(99999).id).toBe("production");
  });

  it("builds every pattern its biomes use", () => {
    const ids = new Set<PatternId>(
      BIOMES.flatMap((biome) => biome.patterns.map(([id]) => id)),
    );
    for (const id of ids) {
      const pattern = buildPattern(id, { seed: 3 }, SPEED_START);
      expect(pattern.pieces.length, id).toBeGreaterThan(0);
      expect(pattern.length, id).toBeGreaterThan(0);
    }
  });

  it("announces each new biome and every 500 m", () => {
    const seen: string[] = [];
    const { state } = autoplay(newRun(5), FPS * 90, (running) => {
      for (const event of running.events) {
        if (event.type === "biome") seen.push(event.biome);
        if (event.type === "milestone") seen.push(`${String(event.metres)} m`);
      }
    });
    expect(state.alive).toBe(true);
    expect(seen.slice(0, 5)).toEqual([
      "500 m",
      "server-room",
      "1000 m",
      "1500 m",
      "cloud",
    ]);
    expect(seen).toContain("cloud");
  });
});

describe("replays", () => {
  it("replaying a run's inputs gives exactly the same run", () => {
    const { state, log } = autoplay(newRun(11), FPS * 45);
    const again = replay(11, log, state.frame);
    expect(again).toEqual(state);
  });

  it("a replay with different inputs ends differently", () => {
    const { state, log } = autoplay(newRun(12), FPS * 30);
    const tampered = replay(
      12,
      log.slice(0, Math.floor(log.length / 2)),
      state.frame,
    );
    expect(tampered.alive).toBe(false);
  });
});

describe("balance", () => {
  // Every pattern has to be clearable at every speed. The autopilot plays well
  // but not perfectly, so a crash here almost always means something unfair.
  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "seed %i can be run for three minutes, into Production",
    (seed) => {
      const { state } = autoplay(newRun(seed), FPS * 180);
      expect(state.cause).toBeNull();
      expect(state.biome).toBe("production");
    },
  );

  // Touch screens only jump (a tap anywhere): no pattern may need a slide.
  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    "seed %i can be run for three minutes with jumps alone",
    (seed) => {
      const { state } = autoplay(newRun(seed), FPS * 180, undefined, {
        slide: false,
      });
      expect(state.cause).toBeNull();
      expect(state.biome).toBe("production");
    },
  );

  it("offers power-ups now and then", () => {
    const offered = new Set<number>();
    autoplay(newRun(9), FPS * 120, (running) => {
      for (const pickup of running.pickups) {
        if (pickup.kind !== "token") offered.add(pickup.id);
      }
    });
    expect(offered.size).toBeGreaterThanOrEqual(3);
  });
});
