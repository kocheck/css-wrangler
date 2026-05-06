import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const CLI_ENTRY = resolve(__dirname, "../../src/cli.ts");
// Use the tsx binary directly so SIGTERM reaches the actual daemon process
// (npx adds a wrapper layer that can swallow signals on some platforms).
const TSX_BIN = resolve(__dirname, "../../../node_modules/.bin/tsx");

export interface SpawnedDaemon {
  child: ChildProcess;
  stderr: string[];
  awaitStderrMatch: (re: RegExp, timeoutMs?: number) => Promise<string>;
  stop: () => Promise<void>;
}

export interface SpawnOptions {
  env?: Record<string, string>;
}

/**
 * Spawn `tsx cli/src/cli.ts <command> [args]`. Captures stderr line-by-line
 * for assertions; stdin/stdout are available on `child` for stdio MCP tests.
 *
 * `awaitStderrMatch` is event-driven — it resolves the moment a matching line
 * arrives on the child's stderr stream, with no polling delay.
 */
export function spawnDaemon(
  command: "mcp" | "watch",
  args: string[] = [],
  options: SpawnOptions = {},
): SpawnedDaemon {
  const child = spawn(TSX_BIN, [CLI_ENTRY, command, ...args], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...options.env },
  });

  const stderr: string[] = [];
  const lineWaiters = new Set<(line: string) => void>();
  let buf = "";

  child.stderr?.on("data", (chunk: Buffer) => {
    buf += chunk.toString();
    let i: number;
    // eslint-disable-next-line no-cond-assign
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      stderr.push(line);
      for (const fn of lineWaiters) fn(line);
    }
  });

  const awaitStderrMatch = (re: RegExp, timeoutMs = 5000): Promise<string> =>
    new Promise((resolveP, rejectP) => {
      for (const line of stderr) {
        if (re.test(line)) return resolveP(line);
      }
      const onLine = (line: string): void => {
        if (!re.test(line)) return;
        lineWaiters.delete(onLine);
        clearTimeout(timer);
        resolveP(line);
      };
      const timer = setTimeout(() => {
        lineWaiters.delete(onLine);
        rejectP(new Error(`timeout waiting for stderr ${re} (got: ${stderr.join("\n")})`));
      }, timeoutMs);
      lineWaiters.add(onLine);
    });

  const stop = async (): Promise<void> => {
    if (child.killed || child.exitCode !== null) return;
    child.kill("SIGTERM");
    await new Promise<void>((r) => {
      const t = setTimeout(() => {
        child.kill("SIGKILL");
        r();
      }, 2000);
      child.once("exit", () => {
        clearTimeout(t);
        r();
      });
    });
  };

  return { child, stderr, awaitStderrMatch, stop };
}

/**
 * Pick a random port in the IANA dynamic range (49152-65535) for each test.
 * Random — not sequential — to avoid collisions between test files running
 * in parallel vitest worker threads (each thread has its own module state).
 */
export function nextFreePort(): number {
  return 49152 + Math.floor(Math.random() * 16383);
}
