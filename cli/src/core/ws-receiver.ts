import { WebSocketServer, type WebSocket } from "ws";
import { PATCH_PUSHED_TYPE } from "../../../src/shared/mcp-messages";
import { inspectEnvelope } from "./inspect-envelope";
import type { PatchBus } from "./patch-bus";

export interface Receiver {
  wss: WebSocketServer;
  isPanelConnected: () => boolean;
  /** Resolves when the underlying socket has finished binding the port. */
  listening: Promise<void>;
}

/**
 * Localhost WebSocket endpoint that the extension panel pushes patches to.
 * Mirrors the structure of bridge/src/server.ts (different port, different
 * message envelope, no relay — patches go straight to the bus).
 *
 * The MCP server reads from the bus over stdio; the WS server is one-way
 * panel→CLI. Logs go to stderr so they don't pollute the stdio MCP channel.
 */
export function startReceiver(port: number, bus: PatchBus): Receiver {
  const wss = new WebSocketServer({ port, host: "127.0.0.1" });
  const clients = new Set<WebSocket>();
  const listening = new Promise<void>((resolve, reject) => {
    wss.once("listening", () => resolve());
    wss.once("error", (err) => reject(err));
  });

  wss.on("connection", (socket) => {
    clients.add(socket);
    log(`+ panel connected (${clients.size} total)`);

    socket.on("message", (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        log(`! invalid JSON from panel`);
        return;
      }
      const envelope = inspectEnvelope(parsed);
      switch (envelope.kind) {
        case "invalid":
          log(`! ${envelope.reason}`);
          return;
        case "unknown":
          log(`! unknown message type: ${envelope.type}`);
          return;
        case PATCH_PUSHED_TYPE:
          bus.push(envelope.patch);
          log(`> patch-pushed url=${envelope.patch.url} edits=${envelope.patch.edits.length}`);
          return;
      }
    });

    socket.on("error", (err) => log(`! socket error: ${err.message}`));

    socket.on("close", () => {
      clients.delete(socket);
      log(`- panel disconnected (${clients.size} total)`);
    });
  });

  wss.on("error", (err) => log(`! server error: ${err.message}`));

  return { wss, isPanelConnected: () => clients.size > 0, listening };
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  process.stderr.write(`[mcp-ws ${ts}] ${msg}\n`);
}
