import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { DEFAULT_MCP_PORT } from "../../../src/shared/mcp-messages";
import { parsePort } from "../../../src/shared/validate-port";
import { writePatchAtomic } from "../core/disk-writer";
import { PatchBus } from "../core/patch-bus";
import { installGracefulShutdown } from "../core/shutdown";
import { startReceiver } from "../core/ws-receiver";

const DEFAULT_PATH = join(homedir(), ".css-wrangler", "latest.json");

interface WatchFlags {
  port: number;
  path: string;
}

function parseFlags(argv: string[]): WatchFlags {
  let portOverride: string | undefined;
  let path = DEFAULT_PATH;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--port") {
      if (!value) throw new Error("--port requires a value");
      portOverride = value;
      i++;
    } else if (flag === "--path") {
      if (!value) throw new Error("--path requires a value");
      path = resolve(value);
      i++;
    } else {
      throw new Error(`unknown flag: ${flag}`);
    }
  }
  const port = parsePort(portOverride ?? process.env.WRANGLER_MCP_PORT, DEFAULT_MCP_PORT);
  return { port, path };
}

export async function runWatch(argv: string[]): Promise<void> {
  let flags: WatchFlags;
  try {
    flags = parseFlags(argv);
  } catch (err) {
    process.stderr.write(
      `css-wrangler watch: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }

  const bus = new PatchBus();
  const { wss, listening } = startReceiver(flags.port, bus);
  await listening;
  process.stderr.write(`[watch] listening for panel pushes on ws://localhost:${flags.port}\n`);
  process.stderr.write(`[watch] writing latest patch to ${flags.path}\n`);

  bus.subscribe(async (patch) => {
    try {
      await writePatchAtomic(flags.path, patch);
      process.stderr.write(
        `[watch] wrote ${flags.path} (url=${patch.url} edits=${patch.edits.length})\n`,
      );
    } catch (err) {
      process.stderr.write(
        `[watch] write failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  });

  installGracefulShutdown("watch", wss);

  await new Promise<void>(() => {});
}
