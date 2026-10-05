/**
 * A stand-in for ClamAV's clamd during e2e runs: speaks INSTREAM over TCP and
 * "finds" malware in any file containing FAKE_MALWARE. (Not the real EICAR test
 * string: antivirus on a developer's machine would quarantine this file.)
 * Started by playwright.config.ts; the server under test gets CLAMAV_ADDRESS.
 */
import { createServer } from "node:net";

export const FAKE_CLAMD_PORT = 4332;
export const FAKE_MALWARE = "TRILLEO-FAKE-MALWARE";
export const FAKE_SIGNATURE = "Trilleo.Test.Fake";

function serve() {
  createServer((socket) => {
    let buffer = Buffer.alloc(0);
    let started = false;
    // Only the tail matters for a marker split across chunks; keep a little of it.
    let seen = "";
    let found = false;
    socket.on("error", () => undefined);
    socket.on("data", (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      if (!started) {
        const end = buffer.indexOf(0);
        if (end < 0) return;
        const command = buffer.subarray(0, end).toString();
        buffer = buffer.subarray(end + 1);
        if (command === "zPING" || command === "PING") {
          socket.end("PONG\0");
          return;
        }
        if (command !== "zINSTREAM") {
          socket.end("UNKNOWN COMMAND\0");
          return;
        }
        started = true;
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0);
        if (length === 0) {
          socket.end(
            found ? `stream: ${FAKE_SIGNATURE} FOUND\0` : "stream: OK\0",
          );
          return;
        }
        if (buffer.length < 4 + length) return;
        seen += buffer.subarray(4, 4 + length).toString("latin1");
        if (seen.includes(FAKE_MALWARE)) found = true;
        seen = seen.slice(-FAKE_MALWARE.length);
        buffer = buffer.subarray(4 + length);
      }
    });
  }).listen(FAKE_CLAMD_PORT, "127.0.0.1", () => {
    console.log(`Fake clamd on 127.0.0.1:${String(FAKE_CLAMD_PORT)}`);
  });
}

if (import.meta.main) serve();
