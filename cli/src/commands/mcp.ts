import { DEFAULT_MCP_PORT } from "../../../src/shared/mcp-messages";
import { PatchBus } from "../core/patch-bus";
import { startReceiver } from "../core/ws-receiver";
import { startMcpServer } from "../mcp/server";

export async function runMcp(): Promise<void> {
  const portEnv = process.env.WRANGLER_MCP_PORT;
  const port = portEnv ? Number(portEnv) : DEFAULT_MCP_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    process.stderr.write(`css-wrangler mcp: invalid WRANGLER_MCP_PORT "${portEnv}"\n`);
    process.exit(1);
  }

  const bus = new PatchBus();
  const wss = startReceiver(port, bus);
  process.stderr.write(`[mcp] listening for panel pushes on ws://localhost:${port}\n`);
  await startMcpServer(bus);
  process.stderr.write(`[mcp] ready (stdio transport)\n`);

  const shutdown = (signal: string): void => {
    process.stderr.write(`\n[mcp] received ${signal}, shutting down\n`);
    wss.close(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
