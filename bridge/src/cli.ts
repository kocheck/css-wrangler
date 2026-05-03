import { startServer } from "./server";
import { DEFAULT_BRIDGE_PORT } from "../../src/shared/bridge-messages";

const portEnv = process.env.WRANGLER_BRIDGE_PORT;
const PORT = portEnv ? Number(portEnv) : DEFAULT_BRIDGE_PORT;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`[bridge] invalid port: ${portEnv}`);
  process.exit(1);
}

const wss = startServer(PORT);
console.log(`[bridge] listening on ws://localhost:${PORT}`);
console.log(`[bridge] press Ctrl+C to stop`);

process.on("SIGINT", () => {
  console.log("\n[bridge] shutting down");
  wss.close(() => process.exit(0));
});
