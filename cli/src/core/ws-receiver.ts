import { WebSocketServer, type WebSocket } from "ws";
import type { McpMessage } from "../../../src/shared/mcp-messages";
import type { PatchBus } from "./patch-bus";

/**
 * Localhost WebSocket endpoint that the extension panel pushes patches to.
 * Mirrors the structure of bridge/src/server.ts (different port, different
 * message envelope, no relay — patches go straight to the bus).
 *
 * The MCP server reads from the bus over stdio; the WS server is one-way
 * panel→CLI. Logs go to stderr so they don't pollute the stdio MCP channel.
 */
export function startReceiver(port: number, bus: PatchBus): WebSocketServer {
  const wss = new WebSocketServer({ port, host: "127.0.0.1" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (socket) => {
    clients.add(socket);
    bus.setPanelConnected(true);
    log(`+ panel connected (${clients.size} total)`);

    socket.on("message", (raw) => {
      let msg: McpMessage;
      try {
        msg = JSON.parse(raw.toString()) as McpMessage;
      } catch {
        log(`! invalid JSON from panel`);
        return;
      }
      if (msg.type === "patch-pushed") {
        bus.push(msg.patch);
        log(`> patch-pushed url=${msg.patch.url} edits=${msg.patch.edits.length}`);
        return;
      }
      log(`! unknown message type: ${describeUnknown(msg)}`);
    });

    socket.on("close", () => {
      clients.delete(socket);
      if (clients.size === 0) bus.setPanelConnected(false);
      log(`- panel disconnected (${clients.size} total)`);
    });
  });

  wss.on("error", (err) => log(`! server error: ${err.message}`));
  return wss;
}

// `msg` narrows to `never` after the exhaustive switch above, so peek at the
// raw object without re-parsing.
function describeUnknown(msg: unknown): string {
  if (typeof msg === "object" && msg !== null && "type" in msg) {
    const type = (msg as { type: unknown }).type;
    return typeof type === "string" ? type : "<no type>";
  }
  return "<not an object>";
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  process.stderr.write(`[mcp-ws ${ts}] ${msg}\n`);
}
