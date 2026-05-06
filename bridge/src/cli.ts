import { startServer } from "./server";
import { DEFAULT_BRIDGE_PORT } from "../../src/shared/bridge-messages";
import { parsePort } from "../../src/shared/validate-port";

let PORT: number;
try {
  PORT = parsePort(process.env.WRANGLER_BRIDGE_PORT, DEFAULT_BRIDGE_PORT);
} catch (err) {
  console.error(`[bridge] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const wss = startServer(PORT);
console.log(`[bridge] listening on ws://localhost:${PORT}`);
console.log(`[bridge] press Ctrl+C to stop`);

process.on("SIGINT", () => {
  console.log("\n[bridge] shutting down");
  wss.close(() => process.exit(0));
});
