import { createServer, type AddressInfo, type Server } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  ClamdScanner,
  parseClamdAddress,
  parseClamdReply,
  type ScanResult,
} from "./clamd";

// A stand-in clamd: reads INSTREAM chunks and "finds" a marker string. (Not the EICAR
// test string: antivirus on a developer's machine would quarantine this file.)
const MARKER = "TRILLEO-FAKE-MALWARE";

function fakeClamd(options: { limit?: number; reply?: string } = {}) {
  const received: number[] = [];
  const server = createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let header = false;
    let body = Buffer.alloc(0);
    socket.on("data", (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      if (!header) {
        const end = buffer.indexOf(0);
        if (end < 0) return;
        expect(buffer.subarray(0, end).toString()).toBe("zINSTREAM");
        buffer = buffer.subarray(end + 1);
        header = true;
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0);
        if (length === 0) {
          const text = body.toString("latin1");
          socket.end(
            options.reply ??
              (text.includes(MARKER)
                ? "stream: Trilleo.Test.Fake FOUND\0"
                : "stream: OK\0"),
          );
          return;
        }
        if (buffer.length < 4 + length) return;
        received.push(length);
        body = Buffer.concat([body, buffer.subarray(4, 4 + length)]);
        buffer = buffer.subarray(4 + length);
        if (options.limit !== undefined && body.length > options.limit) {
          socket.end("INSTREAM size limit exceeded. ERROR\0");
          return;
        }
      }
    });
  });
  return new Promise<{ server: Server; port: number; received: number[] }>(
    (resolve) => {
      server.listen(0, "127.0.0.1", () => {
        resolve({
          server,
          port: (server.address() as AddressInfo).port,
          received,
        });
      });
    },
  );
}

let open: Server | null = null;
afterEach(() => {
  open?.close();
  open = null;
});

async function scan(port: number, chunks: Uint8Array[]): Promise<ScanResult> {
  const session = await new ClamdScanner({ host: "127.0.0.1", port }).start();
  if (!session) throw new Error("no session");
  for (const chunk of chunks) await session.write(chunk);
  return session.finish();
}

const bytes = (text: string) => new TextEncoder().encode(text);

describe("ClamdScanner", () => {
  it("streams the bytes and reads a clean answer", async () => {
    const fake = await fakeClamd();
    open = fake.server;
    const big = new Uint8Array(2.5 * 1024 * 1024);
    expect(await scan(fake.port, [bytes("hello "), big])).toEqual({
      status: "clean",
    });
    // Chunks never exceed 1 MiB.
    expect(Math.max(...fake.received)).toBe(1024 * 1024);
  });

  it("reports what it finds, even across chunk edges", async () => {
    const fake = await fakeClamd();
    open = fake.server;
    expect(
      await scan(fake.port, [bytes("aaa TRILLEO-FAKE-"), bytes("MALWARE bbb")]),
    ).toEqual({ status: "infected", signature: "Trilleo.Test.Fake" });
  });

  it("calls a file over clamd's limit unscanned", async () => {
    const fake = await fakeClamd({ limit: 10 });
    open = fake.server;
    expect(
      await scan(fake.port, [bytes("0123456789"), bytes("0123456789")]),
    ).toEqual({ status: "unscanned", reason: "It’s too big to scan." });
  });

  it("gives no session when clamd isn't there", async () => {
    const fake = await fakeClamd();
    const { port } = fake;
    await new Promise((resolve) => fake.server.close(resolve));
    expect(
      await new ClamdScanner({ host: "127.0.0.1", port }).start(),
    ).toBeNull();
  });
});

describe("parsing", () => {
  it("reads clamd's answers", () => {
    expect(parseClamdReply("stream: OK\0")).toEqual({ status: "clean" });
    expect(parseClamdReply("stream: Win.Trojan.Agent-1 FOUND\0")).toEqual({
      status: "infected",
      signature: "Win.Trojan.Agent-1",
    });
    expect(
      parseClamdReply("stream: Heuristics.Limits.Exceeded.MaxFileSize FOUND"),
    ).toMatchObject({ status: "unscanned" });
    expect(parseClamdReply("")).toMatchObject({ status: "unscanned" });
  });

  it("reads addresses", () => {
    expect(parseClamdAddress("clamav")).toEqual({ host: "clamav", port: 3310 });
    expect(parseClamdAddress("127.0.0.1:3311")).toEqual({
      host: "127.0.0.1",
      port: 3311,
    });
    expect(parseClamdAddress("bad host")).toBeNull();
  });
});
