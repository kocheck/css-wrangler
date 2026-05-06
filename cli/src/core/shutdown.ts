import type { WebSocketServer } from "ws";

const FORCE_EXIT_TIMEOUT_MS = 3000;

/**
 * Wire SIGINT and SIGTERM to a graceful WebSocket shutdown:
 *   1. force-close any connected clients (otherwise wss.close blocks until
 *      they disconnect on their own — Ctrl+C with a connected panel hangs)
 *   2. wss.close, log on error
 *   3. hard-exit after FORCE_EXIT_TIMEOUT_MS if close() never fires
 *   4. on a second signal, exit immediately with code 1
 */
export function installGracefulShutdown(name: string, wss: WebSocketServer): void {
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      process.stderr.write(`[${name}] forcing exit on second ${signal}\n`);
      process.exit(1);
    }
    shuttingDown = true;
    process.stderr.write(`\n[${name}] received ${signal}, shutting down\n`);

    for (const client of wss.clients) {
      try {
        client.terminate();
      } catch {
        // already gone
      }
    }

    wss.close((err) => {
      if (err) {
        process.stderr.write(`[${name}] close error: ${err.message}\n`);
        process.exit(1);
      }
      process.exit(0);
    });

    setTimeout(() => {
      process.stderr.write(
        `[${name}] close timed out after ${FORCE_EXIT_TIMEOUT_MS}ms, forcing exit\n`,
      );
      process.exit(1);
    }, FORCE_EXIT_TIMEOUT_MS).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
