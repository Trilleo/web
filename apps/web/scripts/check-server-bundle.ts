/**
 * Proves the built server runs on its own, as in the app image (which has no
 * node_modules): copies the build outside the repo, starts it, and requests server
 * pages. Catches a dependency left out of the bundle before Docker does.
 * Usage: node scripts/check-server-bundle.ts [build-dir]   (default: dist)
 */
import { spawn } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const build = resolve(process.argv[2] ?? "dist");
const copy = mkdtempSync(join(tmpdir(), "trilleo-server-"));
cpSync(build, join(copy, "dist"), { recursive: true });

// Only what the container would have: no NODE_PATH, a database that isn't there.
const server = spawn(process.execPath, [join(copy, "dist/server/entry.mjs")], {
  cwd: copy,
  env: {
    PATH: process.env.PATH,
    HOST: "127.0.0.1",
    PORT: "0",
    DATABASE_URL: "postgres://check@127.0.0.1:1/check",
    MIGRATIONS_DIR: copy,
    GITHUB_CLIENT_ID: "check",
    GITHUB_CLIENT_SECRET: "check",
    ADMIN_GITHUB_IDS: "1",
  },
});

let output = "";
server.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
server.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));

function finish(problem?: string): never {
  server.kill();
  try {
    rmSync(copy, { recursive: true, force: true, maxRetries: 5 });
  } catch {
    // Windows may still hold the stopped server's files; it's a temp folder.
  }
  if (problem) {
    console.error(`Server bundle check failed: ${problem}\n\n${output}`);
    process.exit(1);
  }
  console.log("Server bundle check: runs without node_modules.");
  process.exit(0);
}

const origin = await new Promise<string>((found) => {
  const timer = setTimeout(
    () => finish("the server didn't start within 20 s"),
    20_000,
  );
  server.on("exit", (code) =>
    finish(`the server exited (code ${String(code)})`),
  );
  server.stdout.on("data", () => {
    const match = /listening on (http:\/\/[^"\s]+)/.exec(output);
    if (match?.[1]) {
      clearTimeout(timer);
      found(match[1]);
    }
  });
});

// Each status proves a part of the bundle loads: pages (React), redirects, and the
// Postgres driver (503 is the right answer with no database).
const expected: [string, number][] = [
  ["/sign-in", 200],
  ["/admin", 302],
  ["/account", 302],
  ["/api/health", 503],
];
for (const [path, status] of expected) {
  const response = await fetch(origin + path, { redirect: "manual" }).catch(
    (error: unknown) => finish(`${path} failed: ${String(error)}`),
  );
  if (response.status !== status) {
    finish(
      `${path} answered ${String(response.status)}, expected ${String(status)}`,
    );
  }
}
finish();
