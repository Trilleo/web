/**
 * The human check's memory: who has been doing what lately, signed challenges and
 * passes, and counts waiting to be written. All of it in memory, with a secret made
 * when the server starts: a restart forgets visitors and voids passes, which only
 * means a few people solve another check. Visitors are an HMAC of their IP, never
 * the IP.
 *
 * Challenges and passes are signed tokens (`<payload>.<mac>`), so the server keeps
 * nothing per challenge until it's answered; answered ones are remembered until they
 * expire, so each works once.
 */
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  POW_BITS,
  PUZZLE_LEVEL,
  answerKey,
  checkPow,
  makePuzzle,
  normalizeTextAnswer,
  requiredLevel,
  type CheckLevel,
  type CheckMode,
  type Puzzle,
} from "@trilleo/captcha";
import { CHECK_ROUTES, type CheckRoute } from "./routes";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export const CHECK_LIMITS = {
  /** Time to answer a challenge. */
  challengeMs: 10 * MINUTE_MS,
  /** A pass lasts this long… */
  passMs: 30 * MINUTE_MS,
  /** …or this many checked actions. */
  passUses: 10,
  /** Failed checks in an hour after which a visitor is turned away for a while. */
  failuresToRefuse: 12,
  /** Visitors remembered at once (more, and the oldest memories go). */
  maxVisitors: 20_000,
} as const;

export type CheckCount = "challenged" | "passed" | "failed" | "puzzles";
export type CheckCounts = Record<CheckCount, number>;

interface PowPayload {
  k: "pow";
  r: CheckRoute;
  l: 1 | 2;
  s: string;
  v: string;
  e: number;
}

interface PuzzlePayload {
  k: "puzzle";
  r: CheckRoute;
  s: string;
  v: string;
  e: number;
  /** MACs of the grid's answer and the question's. */
  g: string;
  t: string;
}

interface PassPayload {
  k: "pass";
  id: string;
  l: CheckLevel;
  v: string;
  e: number;
}

type Payload = PowPayload | PuzzlePayload | PassPayload;

export interface Answer {
  nonce?: number;
  cells?: readonly number[];
  text?: string;
}

export type VerifyResult =
  | { ok: true; level: CheckLevel }
  | { ok: false; reason: "invalid" | "expired" | "spent" | "wrong" };

export class Checker {
  private readonly secret: Buffer;
  private readonly clock: () => number;
  private readonly actions = new Map<string, number[]>();
  private readonly failures = new Map<string, number[]>();
  private readonly spent = new Map<string, number>();
  private readonly passUses = new Map<string, number>();
  private counts = new Map<CheckRoute, CheckCounts>();
  /** Failed checks across all visitors, for spotting a flood. */
  private recentFailures: number[] = [];

  constructor(options: { secret?: Buffer; now?: () => number } = {}) {
    this.secret = options.secret ?? randomBytes(32);
    this.clock = options.now ?? Date.now;
  }

  private mac(text: string): string {
    return createHmac("sha256", this.secret)
      .update(text)
      .digest("base64url")
      .slice(0, 32);
  }

  private sign(payload: Payload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${body}.${this.mac(body)}`;
  }

  private open(token: string): Payload | null {
    const [body, mac] = token.split(".");
    if (!body || mac?.length !== 32) return null;
    const expected = Buffer.from(this.mac(body));
    if (!timingSafeEqual(expected, Buffer.from(mac))) return null;
    try {
      return JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    } catch {
      return null;
    }
  }

  /** Who's asking, without keeping their IP. */
  visitor(ip: string): string {
    return this.mac(`visitor\n${ip}`).slice(0, 22);
  }

  private recent(map: Map<string, number[]>, key: string): number[] {
    const now = this.clock();
    const kept = (map.get(key) ?? []).filter((t) => now - t < HOUR_MS);
    if (kept.length > 0) map.set(key, kept);
    else map.delete(key);
    return kept;
  }

  private push(map: Map<string, number[]>, key: string): void {
    if (!map.has(key) && map.size >= CHECK_LIMITS.maxVisitors) map.clear();
    map.set(key, [...this.recent(map, key), this.clock()]);
  }

  failuresOf(visitor: string): number {
    return this.recent(this.failures, visitor).length;
  }

  /** Too many failures lately: no more challenges for this visitor for now. */
  refused(visitor: string): boolean {
    return this.failuresOf(visitor) >= CHECK_LIMITS.failuresToRefuse;
  }

  /** The level the visitor's next action on `route` needs. */
  level(route: CheckRoute, visitor: string, mode: CheckMode): CheckLevel {
    return requiredLevel({
      recent: this.recent(this.actions, `${route}\n${visitor}`).length,
      failures: this.failuresOf(visitor),
      steps: CHECK_ROUTES[route].steps,
      mode,
    });
  }

  /** An action went ahead (it counts toward the next one's level). */
  accept(route: CheckRoute, visitor: string): void {
    this.push(this.actions, `${route}\n${visitor}`);
  }

  private salt(): string {
    return randomBytes(12).toString("base64url");
  }

  powChallenge(
    route: CheckRoute,
    visitor: string,
    level: 1 | 2,
  ): { token: string; salt: string; bits: number } {
    const salt = this.salt();
    const token = this.sign({
      k: "pow",
      r: route,
      l: level,
      s: salt,
      v: visitor,
      e: this.clock() + CHECK_LIMITS.challengeMs,
    });
    return { token, salt, bits: POW_BITS[level] };
  }

  puzzleChallenge(
    route: CheckRoute,
    visitor: string,
    random: () => number = () => randomBytes(4).readUInt32BE() / 0x1_0000_0000,
  ): { token: string; puzzle: Puzzle } {
    const puzzle = makePuzzle(random);
    const salt = this.salt();
    const token = this.sign({
      k: "puzzle",
      r: route,
      s: salt,
      v: visitor,
      e: this.clock() + CHECK_LIMITS.challengeMs,
      g: this.mac(`${salt}\ngrid\n${answerKey(puzzle.answer)}`),
      t: this.mac(`${salt}\ntext\n${normalizeTextAnswer(puzzle.textAnswer)}`),
    });
    return { token, puzzle };
  }

  private forgetSpent(): void {
    if (this.spent.size < 1000) return;
    const now = this.clock();
    for (const [salt, until] of this.spent)
      if (until < now) this.spent.delete(salt);
    if (this.spent.size >= CHECK_LIMITS.maxVisitors) this.spent.clear();
  }

  /** Checks an answer to a challenge for this route and visitor (once only). */
  verify(
    token: string,
    route: CheckRoute,
    visitor: string,
    answer: Answer,
  ): VerifyResult {
    const payload = this.open(token);
    if (
      !payload ||
      payload.k === "pass" ||
      payload.r !== route ||
      payload.v !== visitor
    )
      return { ok: false, reason: "invalid" };
    if (payload.e < this.clock()) return { ok: false, reason: "expired" };
    if (this.spent.has(payload.s)) return { ok: false, reason: "spent" };
    this.forgetSpent();
    this.spent.set(payload.s, payload.e);
    if (payload.k === "pow") {
      const right =
        answer.nonce !== undefined &&
        checkPow(payload.s, POW_BITS[payload.l], answer.nonce, (input) =>
          createHash("sha256").update(input).digest(),
        );
      return right
        ? { ok: true, level: payload.l }
        : { ok: false, reason: "wrong" };
    }
    const grid =
      answer.cells !== undefined &&
      answer.cells.length > 0 &&
      this.mac(`${payload.s}\ngrid\n${answerKey(answer.cells)}`) === payload.g;
    const text =
      answer.text !== undefined &&
      normalizeTextAnswer(answer.text) !== "" &&
      this.mac(`${payload.s}\ntext\n${normalizeTextAnswer(answer.text)}`) ===
        payload.t;
    return grid || text
      ? { ok: true, level: PUZZLE_LEVEL }
      : { ok: false, reason: "wrong" };
  }

  /** A failed check: it raises the visitor's next level. */
  fail(route: CheckRoute, visitor: string): void {
    this.push(this.failures, visitor);
    this.count(route, "failed");
    const now = this.clock();
    this.recentFailures = [
      ...this.recentFailures.filter((t) => now - t < HOUR_MS),
      now,
    ].slice(-10_000);
  }

  /** Failed checks across everyone in the last hour. */
  failuresLastHour(): number {
    const now = this.clock();
    this.recentFailures = this.recentFailures.filter((t) => now - t < HOUR_MS);
    return this.recentFailures.length;
  }

  issuePass(
    visitor: string,
    level: CheckLevel,
  ): { value: string; expiresAt: Date } {
    const expires = this.clock() + CHECK_LIMITS.passMs;
    const value = this.sign({
      k: "pass",
      id: this.salt(),
      l: level,
      v: visitor,
      e: expires,
    });
    return { value, expiresAt: new Date(expires) };
  }

  /** The pass's ID, if it's good for this visitor at this level with uses left. */
  private goodPass(
    value: string | undefined,
    visitor: string,
    level: CheckLevel,
  ): string | null {
    if (!value) return null;
    const payload = this.open(value);
    if (
      payload?.k !== "pass" ||
      payload.v !== visitor ||
      payload.e < this.clock()
    )
      return null;
    if (payload.l < level) return null;
    return (this.passUses.get(payload.id) ?? 0) < CHECK_LIMITS.passUses
      ? payload.id
      : null;
  }

  /** Whether a pass would cover this level (without spending it). */
  passCovers(
    value: string | undefined,
    visitor: string,
    level: CheckLevel,
  ): boolean {
    return this.goodPass(value, visitor, level) !== null;
  }

  /** Spends one use of a pass, if it's good for this visitor at this level. */
  usePass(
    value: string | undefined,
    visitor: string,
    level: CheckLevel,
  ): boolean {
    const id = this.goodPass(value, visitor, level);
    if (id === null) return false;
    if (
      !this.passUses.has(id) &&
      this.passUses.size >= CHECK_LIMITS.maxVisitors
    )
      this.passUses.clear();
    this.passUses.set(id, (this.passUses.get(id) ?? 0) + 1);
    return true;
  }

  count(route: CheckRoute, what: CheckCount): void {
    const counts = this.counts.get(route) ?? {
      challenged: 0,
      passed: 0,
      failed: 0,
      puzzles: 0,
    };
    counts[what] += 1;
    this.counts.set(route, counts);
  }

  /** Counts since the last call (to be written to captcha_stats). */
  takeCounts(): Map<CheckRoute, CheckCounts> {
    const taken = this.counts;
    this.counts = new Map();
    return taken;
  }
}
