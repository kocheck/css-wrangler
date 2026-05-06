import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const CLI_ENTRY = resolve(__dirname, "../../src/cli.ts");

export interface SpawnedDaemon {
  child: ChildProcess;
  stderr: string[];
  awaitStderrMatch: (re: RegExp, timeoutMs?: number) => Promise<string>;
  stop: () => Promise<void>;
}

/**
 * Spawn `tsx cli/src/cli.ts <command> [args]`. Captures stderr line-by-line
 * for assertions; stdin/stdout are available on `child` for stdio MCP tests.
 */
export function spawnDaemon(command: "mcp" | "watch", args: string[] = []): SpawnedDaemon {
  const child = spawn("npx", ["tsx", CLI_ENTRY, command, ...args], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stderr: string[] = [];
  let buf = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    buf += chunk.toString();
    let i: number;
    // eslint-disable-next-line no-cond-assign
    while ((i = buf.indexOf("\n")) >= 0) {
      stderr.push(buf.slice(0, i));
      buf = buf.slice(i + 1);
    }
  });

  const awaitStderrMatch = (re: RegExp, timeoutMs = 5000): Promise<string> =>
    new Promise((resolveP, rejectP) => {
      const start = Date.now();
      const tick = (): void => {
        for (const line of stderr) {
          if (re.test(line)) return resolveP(line);
        }
        if (Date.now() - start > timeoutMs) {
          return rejectP(new Error(`timeout waiting for stderr ${re} (got: ${stderr.join("\n")})`));
        }
        setTimeout(tick, 50);
      };
      tick();
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

let nextPort = 19124;
export function nextFreePort(): number {
  return nextPort++;
}
