// Modeled on src/panel/lib/bridge-client.ts. Single-purpose: push patches
// to the local css-wrangler MCP daemon (cli/src/commands/mcp.ts) over WS.
// Silently no-ops if the daemon isn't running — the clipboard path is the
// user's working alternative.
import { DEFAULT_MCP_URL, MCP_PROTOCOL_VERSION, type PatchPushedMsg } from "@shared/mcp-messages";
import type { Patch } from "@shared/types";

export type McpStatus = "offline" | "connecting" | "connected";

let socket: WebSocket | null = null;
let status: McpStatus = "offline";
let backoffMs = 2000;
let reconnectTimer: number | null = null;
const statusListeners = new Set<(status: McpStatus) => void>();

export function startMcpClient(): void {
  if (socket) return;
  setStatus("connecting");
  let next: WebSocket;
  try {
    next = new WebSocket(DEFAULT_MCP_URL);
  } catch {
    scheduleReconnect();
    return;
  }
  socket = next;
  next.addEventListener("open", () => {
    backoffMs = 2000;
    setStatus("connected");
  });
  next.addEventListener("close", () => {
    if (socket === next) socket = null;
    scheduleReconnect();
  });
  next.addEventListener("error", () => {
    next.close();
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer != null) return;
  setStatus("offline");
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    backoffMs = Math.min(backoffMs * 2, 8000);
    startMcpClient();
  }, backoffMs);
}

function setStatus(next: McpStatus): void {
  if (status === next) return;
  status = next;
  for (const l of statusListeners) l(status);
}

export function pushPatch(patch: Patch): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  const msg: PatchPushedMsg = { type: "patch-pushed", version: MCP_PROTOCOL_VERSION, patch };
  socket.send(JSON.stringify(msg));
  return true;
}

export function getMcpStatus(): McpStatus {
  return status;
}

export function onMcpStatus(fn: (status: McpStatus) => void): () => void {
  statusListeners.add(fn);
  fn(status);
  return () => {
    statusListeners.delete(fn);
  };
}
