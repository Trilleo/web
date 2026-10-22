import { press, step } from "./engine";
import type { Input, LoggedInput, RunState } from "./types";

/**
 * A player that looks ahead: each step it tries a handful of plans on copies of the
 * run and takes the first input of whichever lasts longest. The balance tests use it
 * to show every pattern can be cleared; it plays well, not perfectly.
 */

/** Inputs by step offset from now. */
type Plan = readonly (readonly [number, Input])[];

const HORIZON = 120;
/** It acts once doing nothing would crash within this many steps. */
const ACT_AT = 16;

const PLANS: readonly Plan[] = [
  [
    [0, "jump"],
    [1, "jump-end"],
  ],
  [
    [0, "jump"],
    [4, "jump-end"],
  ],
  [
    [0, "jump"],
    [10, "jump-end"],
  ],
  [
    [0, "jump"],
    [40, "jump-end"],
  ],
  [
    [0, "down"],
    [30, "down-end"],
  ],
  [
    [0, "down"],
    [8, "down-end"],
  ],
  [
    [0, "jump"],
    [12, "jump-end"],
    [14, "jump"],
    [40, "jump-end"],
  ],
  [
    [0, "jump"],
    [24, "jump-end"],
    [26, "jump"],
    [50, "jump-end"],
  ],
  [
    [3, "jump"],
    [6, "jump-end"],
  ],
  [
    [6, "jump"],
    [20, "jump-end"],
  ],
];

function release(state: RunState): Input[] {
  const inputs: Input[] = [];
  if (state.held.jump) inputs.push("jump-end");
  if (state.held.down) inputs.push("down-end");
  return inputs;
}

/** Steps until a crash if nobody touches anything, up to `limit`. */
function idleSurvival(state: RunState, limit: number): number {
  const copy = structuredClone(state);
  for (const input of release(copy)) press(copy, input);
  for (let offset = 0; offset < limit; offset++) {
    step(copy);
    if (!copy.alive) return offset;
  }
  return limit;
}

/** How long the run lasts with this plan, then playing on at `depth` - 1. */
function tryPlan(state: RunState, plan: Plan, depth: number): number {
  const copy = structuredClone(state);
  const memory: Memory = { plan, at: 0 };
  for (const input of release(copy)) press(copy, input);
  for (let offset = 0; offset < HORIZON; offset++) {
    for (const input of follow(copy, memory, depth - 1)) press(copy, input);
    step(copy);
    if (!copy.alive) return offset;
  }
  return HORIZON;
}

interface Memory {
  plan: Plan;
  at: number;
}

function follow(state: RunState, memory: Memory, depth: number): Input[] {
  const last = memory.plan.at(-1)?.[0] ?? -1;
  if (memory.at <= last) {
    const due = memory.plan
      .filter(([at]) => at === memory.at)
      .map(([, input]) => input);
    memory.at++;
    return due;
  }
  if (depth <= 0 || idleSurvival(state, ACT_AT + 1) > ACT_AT) {
    return release(state);
  }
  let best: Plan = [];
  let bestScore = -1;
  for (const plan of PLANS) {
    const lasted = tryPlan(state, plan, depth);
    if (lasted > bestScore) {
      best = plan;
      bestScore = lasted;
    }
    if (lasted === HORIZON) break;
  }
  memory.plan = best;
  memory.at = 0;
  return [...release(state), ...follow(state, memory, 0)];
}

/** The inputs for this step. Mutates `memory`, which carries the plan along. */
export function autopilot(state: RunState, memory: Memory): Input[] {
  return follow(state, memory, 2);
}

/** Plays a run with the autopilot until it crashes or reaches `frames`. */
export function autoplay(
  state: RunState,
  frames: number,
  onStep?: (state: RunState) => void,
): { state: RunState; log: LoggedInput[] } {
  const memory: Memory = { plan: [], at: 0 };
  const log: LoggedInput[] = [];
  while (state.alive && state.frame < frames) {
    for (const input of autopilot(state, memory)) {
      log.push({ f: state.frame, i: input });
      press(state, input);
    }
    step(state);
    onStep?.(state);
  }
  return { state, log };
}
