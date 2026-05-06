import type { WebSocketServer } from "ws";

export function installGracefulShutdown(name: string, wss: WebSocketServer): void {
  const shutdown = (signal: string): void => {
    process.stderr.write(`\n[${name}] received ${signal}, shutting down\n`);
    wss.close(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
