import { DEFAULT_MCP_PORT } from "../../../src/shared/mcp-messages";
import { parsePort } from "../../../src/shared/validate-port";
import { PatchBus } from "../core/patch-bus";
import { installGracefulShutdown } from "../core/shutdown";
import { startReceiver } from "../core/ws-receiver";
import { startMcpServer } from "../mcp/server";

export async function runMcp(): Promise<void> {
  let port: number;
  try {
    port = parsePort(process.env.WRANGLER_MCP_PORT, DEFAULT_MCP_PORT);
  } catch (err) {
    process.stderr.write(`css-wrangler mcp: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }

  const bus = new PatchBus();
  const wss = startReceiver(port, bus);
  process.stderr.write(`[mcp] listening for panel pushes on ws://localhost:${port}\n`);
  await startMcpServer(bus);
  process.stderr.write(`[mcp] ready (stdio transport)\n`);

  installGracefulShutdown("mcp", wss);
}
