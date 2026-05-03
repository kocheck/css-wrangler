import { WebSocketServer, type WebSocket } from "ws";
import type {
  BridgeClientKind,
  BridgeMessage,
} from "../../src/shared/bridge-messages";

interface Client {
  socket: WebSocket;
  kind: BridgeClientKind | "unknown";
  id: number;
}

let nextId = 1;

export function startServer(port: number): WebSocketServer {
  const wss = new WebSocketServer({ port, host: "127.0.0.1" });
  const clients = new Set<Client>();

  wss.on("connection", (socket) => {
    const client: Client = { socket, kind: "unknown", id: nextId++ };
    clients.add(client);
    log(`+ client ${client.id} (${clients.size} total)`);

    socket.on("message", (raw) => {
      let msg: BridgeMessage;
      try {
        msg = JSON.parse(raw.toString()) as BridgeMessage;
      } catch {
        log(`! client ${client.id} sent invalid JSON`);
        return;
      }
      if (msg.type === "hello") {
        client.kind = msg.client;
        log(`= client ${client.id} hello as ${client.kind}`);
        return;
      }
      log(`> ${client.kind}#${client.id} ${describe(msg)}`);
      const payload = JSON.stringify(msg);
      let relayed = 0;
      for (const peer of clients) {
        if (peer === client) continue;
        if (peer.socket.readyState !== peer.socket.OPEN) continue;
        peer.socket.send(payload);
        relayed++;
      }
      if (relayed === 0) log(`  (no peers — message dropped)`);
    });

    socket.on("close", () => {
      clients.delete(client);
      log(`- client ${client.id} (${clients.size} total)`);
    });
  });

  wss.on("error", (err) => log(`! server error: ${err.message}`));

  return wss;
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[bridge ${ts}] ${msg}`);
}

function describe(msg: BridgeMessage): string {
  if (msg.type === "push-changes") {
    const props = msg.changes.map((c) => `${c.property}=${c.to}`).join(", ");
    return `push-changes target=${msg.target.display} [${props}]`;
  }
  if (msg.type === "echo") {
    return `echo target=${msg.target?.display ?? "null"}`;
  }
  return msg.type;
}
