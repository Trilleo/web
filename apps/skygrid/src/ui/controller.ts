/**
 * Turns keys, clicks and taps into actions. Walking into something uses it: a tree
 * gets chopped, the merchant opens the shop, water gets a line cast into it.
 */
import {
  DIRS,
  STEP_MS,
  charAt,
  count,
  isDepleted,
  islandOf,
  isWalkable,
  pathNextTo,
  pathTo,
  slotAt,
  tileKind,
  type Dir,
  type GameState,
} from "../core";
import type { GameSession } from "./session";

export type Tab =
  "skills" | "gear" | "bag" | "craft" | "minions" | "collections" | "bazaar";

export interface ControllerUi {
  open(tab: Tab, slot?: number): void;
}

const TIPS = [
  "Minions work while you're away. Craft one from a collection, then place it on your island.",
  "Collections unlock recipes: gather 50 of something to see what it gives you.",
  "Walk into things to use them: trees, crops, ore, water, the merchant.",
  "Better tools work faster, and hoes, axes and pickaxes add fortune: more drops.",
  "Every skill level adds fortune to that skill: more drops the more you practise.",
  "Deeper in the Mines lie iron and gold, for miners with the level and the pickaxe.",
  "At the Shore, cast a line into the water and reel in the moment something bites.",
  "Zombies (z) roam the graveyard. Walk into one to fight; hold the key to keep swinging.",
  "The Spider Cave is past the graveyard. Bring a good sword and armor: spiders bite back.",
  "The Bazaar (¤) in the Hub is where players trade. Buy orders and sell offers wait until someone takes them.",
  "Dying costs a quarter of your coins. Health comes back on its own: step away and wait.",
];

export function guideTip(state: GameState, visits: number): string {
  if (count(state, "wooden_axe") === 0 && count(state, "oak_log") < 6) {
    return "Walk into a tree to chop it. Six Oak Logs make a Wooden Axe (see Craft).";
  }
  if (count(state, "wooden_pickaxe") === 0) {
    return "Craft a Wooden Pickaxe, then head to the Mines, down from the Hub.";
  }
  if (state.minions.every((minion) => minion === null)) {
    return "Gather 50 Wheat to unlock the Wheat Minion: it farms while you're gone.";
  }
  return TIPS[visits % TIPS.length] ?? "";
}

export class Controller {
  facing: Dir = "D";
  private held: Dir | null = null;
  private queue: Dir[] = [];
  private goal: { x: number; y: number } | null = null;
  private loop: ReturnType<typeof setInterval> | undefined;
  private guideVisits = 0;

  constructor(
    private readonly session: GameSession,
    private readonly ui: ControllerUi,
    private readonly now: () => number = () => Date.now(),
  ) {}

  private get state(): GameState {
    return this.session.getView().state;
  }

  /** A direction key went down: step now, then keep walking while it's held. */
  press(d: Dir): void {
    this.held = d;
    this.queue = [];
    this.goal = null;
    this.step();
    this.run();
  }

  release(d: Dir): void {
    if (this.held === d) this.held = null;
  }

  /** E or Space: reel in, or use what you're facing. */
  use(): void {
    if (this.state.fishing) {
      this.session.act({ k: "reel" });
      return;
    }
    const [dx, dy] = DIRS[this.facing];
    this.interact(this.state.pos.x + dx, this.state.pos.y + dy);
  }

  /** A click or tap on the map: walk there, and use it if it's something. */
  clickTile(x: number, y: number): void {
    const { pos } = this.state;
    const distance = Math.abs(pos.x - x) + Math.abs(pos.y - y);
    if (distance === 0) return;
    this.held = null;
    if (distance === 1 && !isWalkable(charAt(islandOf(this.state), x, y))) {
      this.face(x, y);
      this.interact(x, y);
      return;
    }
    const walkable = isWalkable(charAt(islandOf(this.state), x, y));
    const path = walkable
      ? pathTo(this.state, x, y)
      : pathNextTo(this.state, x, y);
    if (!path) {
      this.session.say("You can't get there.", "warn");
      return;
    }
    this.queue = path;
    this.goal = walkable ? null : { x, y };
    this.run();
  }

  private face(x: number, y: number): void {
    const { pos } = this.state;
    if (x < pos.x) this.facing = "L";
    else if (x > pos.x) this.facing = "R";
    else if (y < pos.y) this.facing = "U";
    else this.facing = "D";
  }

  private run(): void {
    if (this.loop !== undefined) return;
    this.loop = setInterval(() => {
      this.step();
    }, STEP_MS);
  }

  stop(): void {
    clearInterval(this.loop);
    this.loop = undefined;
  }

  private step(): void {
    if (this.state.busyUntil > this.now()) return;
    const d = this.queue.shift() ?? this.held;
    if (!d) {
      const goal = this.goal;
      this.goal = null;
      this.stop();
      if (goal) {
        this.face(goal.x, goal.y);
        this.interact(goal.x, goal.y);
      }
      return;
    }
    this.facing = d;
    const [dx, dy] = DIRS[d];
    const x = this.state.pos.x + dx;
    const y = this.state.pos.y + dy;
    if (isWalkable(charAt(islandOf(this.state), x, y))) {
      if (!this.session.act({ k: "move", d })) this.queue.unshift(d);
      return;
    }
    // Walked into something: use it once. Mobs are the exception: holding the key
    // keeps swinging (each swing waits for the last).
    this.queue = [];
    if (tileKind(charAt(islandOf(this.state), x, y)) !== "mob")
      this.held = null;
    this.interact(x, y);
  }

  interact(x: number, y: number): void {
    const state = this.state;
    const kind = tileKind(charAt(islandOf(state), x, y));
    switch (kind) {
      case "node":
        this.session.act({ k: "gather", x, y });
        return;
      case "mob":
        // A fallen mob: nothing to hit until it's back, and no need to say so.
        if (!isDepleted(state, x, y)) this.session.act({ k: "attack", x, y });
        return;
      case "water":
        if (state.fishing) this.session.act({ k: "reel" });
        else if (this.session.act({ k: "cast", x, y })) {
          this.session.say("You cast your line. Wait for the bite…");
        }
        return;
      case "merchant":
        this.session.say(
          "Merchant: “I’ll buy anything you gather. Tools for sale, too.”",
        );
        this.ui.open("bag");
        return;
      case "bazaar":
        this.session.say(
          "The Bazaar: players buy and sell here. See the Bazaar tab.",
        );
        this.ui.open("bazaar");
        return;
      case "guide":
        this.session.say(`Guide: “${guideTip(state, this.guideVisits++)}”`);
        return;
      case "slot": {
        const slot = slotAt(state, x, y);
        const minion = state.minions[slot];
        if (minion && minion.stored > 0)
          this.session.act({ k: "collect", slot });
        this.ui.open("minions", slot);
        return;
      }
      default:
        return;
    }
  }
}
