/**
 * Malware scanning with ClamAV's daemon (clamd), over its TCP protocol: INSTREAM sends
 * the bytes in length-prefixed chunks, and clamd answers "stream: OK" or
 * "stream: <signature> FOUND". No dependency, and the caller feeds chunks as it reads
 * them (with backpressure), so a 1 GB file is never held in memory.
 *
 *   const session = await scanner.start();      // null if clamd isn't answering
 *   for (const chunk of chunks) await session.write(chunk);
 *   const result = await session.finish();
 */
import { connect, type Socket } from "node:net";

export type ScanResult =
  | { status: "clean" }
  | { status: "infected"; signature: string }
  /** The scan couldn't finish (clamd down, the file over its limits, …). */
  | { status: "unscanned"; reason: string };

export interface ScanSession {
  write(chunk: Uint8Array): Promise<void>;
  finish(): Promise<ScanResult>;
  /** Gives up (e.g. reading the file failed). */
  abort(): void;
}

export interface Scanner {
  start(): Promise<ScanSession | null>;
}

export interface ClamdOptions {
  host: string;
  port: number;
  /** How long clamd may take to answer once the bytes are in. */
  timeoutMs?: number;
}

/** clamd's chunks can be any size; 1 MiB keeps writes few and memory small. */
const MAX_CHUNK = 1024 * 1024;

/** "host:port" (port 3310 by default). */
export function parseClamdAddress(value: string): ClamdOptions | null {
  const match = /^([^:\s]+)(?::(\d{1,5}))?$/.exec(value.trim());
  if (!match?.[1]) return null;
  const port = match[2] ? Number(match[2]) : 3310;
  return port > 0 && port < 65536 ? { host: match[1], port } : null;
}

/** Turns clamd's answer into a result. */
export function parseClamdReply(reply: string): ScanResult {
  const text = reply.replace(/\0/g, "").trim();
  if (/^stream: OK$/.test(text)) return { status: "clean" };
  const found = /^stream: (.+) FOUND$/.exec(text);
  if (found?.[1]) {
    // With AlertExceedsMax, files over the size limits are "found" as this: not
    // malware, just not scanned.
    if (found[1].startsWith("Heuristics.Limits.Exceeded"))
      return { status: "unscanned", reason: "It’s too big to scan." };
    return { status: "infected", signature: found[1] };
  }
  if (/size limit exceeded/i.test(text))
    return { status: "unscanned", reason: "It’s too big to scan." };
  return {
    status: "unscanned",
    reason: `The scanner answered: ${text.slice(0, 200) || "nothing"}`,
  };
}

export class ClamdScanner implements Scanner {
  constructor(private readonly options: ClamdOptions) {}

  start(): Promise<ScanSession | null> {
    const { host, port, timeoutMs = 5 * 60_000 } = this.options;
    return new Promise((resolve) => {
      const socket = connect({ host, port });
      const fail = () => {
        socket.destroy();
        resolve(null);
      };
      socket.setTimeout(10_000, fail);
      socket.once("error", fail);
      socket.once("connect", () => {
        socket.removeListener("error", fail);
        socket.setTimeout(0);
        resolve(new ClamdSession(socket, timeoutMs));
      });
    });
  }
}

class ClamdSession implements ScanSession {
  private reply = "";
  private closed: Promise<void>;
  private failure: Error | null = null;

  constructor(
    private readonly socket: Socket,
    private readonly timeoutMs: number,
  ) {
    socket.setEncoding("utf8");
    socket.on("data", (data: string) => {
      this.reply += data;
    });
    socket.on("error", (error) => {
      this.failure = error;
    });
    this.closed = new Promise((resolve) => {
      socket.once("close", () => {
        resolve();
      });
    });
    socket.write("zINSTREAM\0");
  }

  private send(bytes: Uint8Array): Promise<void> {
    // clamd closes the stream early when it's over its limit: stop writing then.
    if (this.socket.destroyed || this.socket.writableEnded)
      return Promise.resolve();
    return new Promise((resolve) => {
      if (this.socket.write(bytes)) resolve();
      else {
        const done = () => {
          this.socket.removeListener("close", done);
          this.socket.removeListener("drain", done);
          resolve();
        };
        this.socket.once("drain", done);
        this.socket.once("close", done);
      }
    });
  }

  async write(chunk: Uint8Array): Promise<void> {
    for (let at = 0; at < chunk.length; at += MAX_CHUNK) {
      const part = chunk.subarray(at, at + MAX_CHUNK);
      const length = new Uint8Array(4);
      new DataView(length.buffer).setUint32(0, part.length);
      await this.send(length);
      await this.send(part);
    }
  }

  async finish(): Promise<ScanResult> {
    await this.send(new Uint8Array(4));
    if (!this.socket.destroyed && !this.socket.writableEnded) this.socket.end();
    const timedOut = await Promise.race([
      this.closed.then(() => false),
      new Promise<boolean>((resolve) =>
        setTimeout(() => {
          resolve(true);
        }, this.timeoutMs).unref(),
      ),
    ]);
    if (timedOut) {
      this.socket.destroy();
      return { status: "unscanned", reason: "The scanner took too long." };
    }
    if (!this.reply && this.failure)
      return {
        status: "unscanned",
        reason: `The scanner failed: ${this.failure.message}`,
      };
    return parseClamdReply(this.reply);
  }

  abort(): void {
    this.socket.destroy();
  }
}
