import { describe, expect, it } from "vitest";
import { DT, newRun, replay } from "../core";
import { Runner } from "./runner";

const STEP = DT * 1000;

describe("the runner", () => {
  it("waits for a jump to start, then runs", () => {
    const runner = new Runner(() => 5, false);
    runner.input("down");
    expect(runner.status).toBe("ready");
    runner.advance(STEP * 10);
    expect(runner.state.frame).toBe(0);
    runner.input("jump");
    expect(runner.status).toBe("running");
    runner.advance(STEP * 10);
    expect(runner.state.frame).toBe(10);
  });

  it("plays a demo course by itself before the first run", () => {
    const runner = new Runner(() => 5, true);
    runner.advance(STEP * 30);
    expect(runner.status).toBe("ready");
    expect(runner.state.distance).toBeGreaterThan(0);
    // The real run starts from scratch.
    runner.input("jump");
    expect(runner.state.frame).toBe(0);
  });

  it("pauses, lets go of held keys, and carries on with a jump", () => {
    const runner = new Runner(() => 5, false);
    runner.input("jump");
    runner.advance(STEP * 3);
    runner.pause();
    expect(runner.status).toBe("paused");
    expect(runner.state.held.jump).toBe(false);
    const frame = runner.state.frame;
    runner.advance(STEP * 30);
    expect(runner.state.frame).toBe(frame);
    runner.input("jump");
    expect(runner.status).toBe("running");
  });

  it("doesn't race after a long stall", () => {
    const runner = new Runner(() => 5, false);
    runner.input("jump");
    runner.advance(10_000);
    expect(runner.state.frame).toBeLessThanOrEqual(15);
  });

  it("ends a run on a crash, and its log replays to the same run", () => {
    const runner = new Runner(() => 9, false);
    runner.input("jump");
    runner.input("jump-end");
    const events = [];
    while (runner.status === "running") events.push(...runner.advance(STEP));
    expect(runner.status).toBe("over");
    expect(events.at(-1)?.type).toBe("crash");
    expect(replay(9, runner.log, runner.state.frame)).toEqual(runner.state);
  });

  it("starts a new course after a crash", () => {
    let seed = 1;
    const runner = new Runner(() => seed++, false);
    runner.input("jump");
    while (runner.status === "running") runner.advance(STEP * 10);
    runner.input("jump");
    expect(runner.status).toBe("running");
    expect(runner.state.frame).toBe(0);
    // One seed for the waiting screen, one per run.
    expect(runner.seed).toBe(3);
    expect(runner.state.seed).toBe(newRun(3).seed);
  });
});

describe("drawing between steps", () => {
  it("shows the run part of the way from the last step to the next", () => {
    const runner = new Runner(() => 5, false);
    runner.input("jump");
    runner.advance(STEP * 10);
    const before = runner.state.distance;
    runner.advance(STEP * 1.5);
    const after = runner.state.distance;
    const view = runner.view();
    expect(view.distance).toBeGreaterThan(before);
    expect(view.distance).toBeLessThan(after);
    // Drawing never changes the run.
    expect(runner.state.distance).toBe(after);
  });

  it("shows the run as it is when nothing moves", () => {
    const runner = new Runner(() => 5, false);
    runner.input("jump");
    runner.advance(STEP * 4.5);
    runner.pause();
    expect(runner.view()).toBe(runner.state);
  });
});
