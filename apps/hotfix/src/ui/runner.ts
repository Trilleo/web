import {
  DT,
  newRun,
  press,
  step,
  type Input,
  type LoggedInput,
  type RunEvent,
  type RunState,
} from "../core";
import { autopilot } from "../core/autopilot";

export type Status = "ready" | "running" | "paused" | "over";

const STEP_MS = DT * 1000;
/** After a long stall (a background tab, a debugger), don't race to catch up. */
const MAX_CATCH_UP_MS = 250;

/**
 * Runs the game in real time: fixed steps from a variable clock, the run's input
 * log, and the start/pause/crash cycle. Before the first run, the robot runs a demo
 * course by itself (unless the visitor prefers less motion).
 */
export class Runner {
  state: RunState;
  status: Status = "ready";
  /** Every input of the current run, to replay it (and, later, for the server to check). */
  log: LoggedInput[] = [];
  seed: number;

  private carry = 0;
  private listeners = new Set<() => void>();
  private demoMemory: Parameters<typeof autopilot>[1] = { plan: [], at: 0 };

  constructor(
    private readonly makeSeed: () => number = randomSeed,
    readonly demo = true,
  ) {
    this.seed = makeSeed();
    this.state = newRun(this.seed);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getStatus = (): Status => this.status;

  private set(status: Status): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener();
  }

  /** A fresh run, from a new seed. */
  start(): void {
    this.seed = this.makeSeed();
    this.state = newRun(this.seed);
    this.log = [];
    this.carry = 0;
    this.set("running");
  }

  /**
   * A key went down or up. Jump starts a run (and jumps) when there isn't one, and
   * carries on after a pause.
   */
  input(input: Input): void {
    if (this.status === "ready" || this.status === "over") {
      if (input !== "jump") return;
      this.start();
    } else if (this.status === "paused") {
      if (input !== "jump") return;
      this.resume();
      return;
    }
    this.log.push({ f: this.state.frame, i: input });
    press(this.state, input);
  }

  pause(): void {
    if (this.status !== "running") return;
    // Keys let go while paused would otherwise stay held.
    if (this.state.held.jump) this.input("jump-end");
    if (this.state.held.down) this.input("down-end");
    this.set("paused");
  }

  resume(): void {
    if (this.status !== "paused") return;
    this.carry = 0;
    this.set("running");
  }

  /** Moves time on by `ms`; returns what happened, in order. */
  advance(ms: number): RunEvent[] {
    const events: RunEvent[] = [];
    const playing = this.status === "running";
    const demoing = this.status === "ready" && this.demo;
    if (!playing && !demoing) return events;

    this.carry += Math.min(ms, MAX_CATCH_UP_MS);
    while (this.carry >= STEP_MS) {
      this.carry -= STEP_MS;
      if (demoing) {
        this.demoStep();
        continue;
      }
      step(this.state);
      events.push(...this.state.events);
      if (!this.state.alive) {
        this.carry = 0;
        this.set("over");
        break;
      }
    }
    return events;
  }

  private demoStep(): void {
    for (const input of autopilot(this.state, this.demoMemory)) {
      press(this.state, input);
    }
    step(this.state);
    if (!this.state.alive) {
      this.state = newRun(this.makeSeed());
      this.demoMemory = { plan: [], at: 0 };
    }
  }
}

function randomSeed(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] ?? 1;
}
