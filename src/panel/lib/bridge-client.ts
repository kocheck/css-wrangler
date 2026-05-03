// MUST stay in sync with figma-plugin/src/bridge-client.ts.
// Duplicated because the Figma plugin lives in a separate workspace with its
// own tsconfig + esbuild bundle (CLAUDE.md invariant 12).
import {
  BRIDGE_PROTOCOL_VERSION,
  type BridgeMessage,
  DEFAULT_BRIDGE_URL,
  type HelloMsg,
} from "@shared/bridge-messages";

export type BridgeStatus = "offline" | "connecting" | "connected";

type Listener = (msg: BridgeMessage) => void;
type StatusListener = (status: BridgeStatus) => void;

let socket: WebSocket | null = null;
let status: BridgeStatus = "offline";
let backoffMs = 2000;
let reconnectTimer: number | null = null;
const listeners = new Set<Listener>();
const statusListeners = new Set<StatusListener>();

const HELLO: HelloMsg = {
  type: "hello",
  client: "panel",
  version: BRIDGE_PROTOCOL_VERSION,
};

export function startBridgeClient(): void {
  if (socket) return;
  setStatus("connecting");
  let next: WebSocket;
  try {
    next = new WebSocket(DEFAULT_BRIDGE_URL);
  } catch {
    scheduleReconnect();
    return;
  }
  socket = next;
  next.addEventListener("open", () => {
    backoffMs = 2000;
    setStatus("connected");
    next.send(JSON.stringify(HELLO));
  });
  next.addEventListener("message", (ev) => {
    let msg: BridgeMessage;
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : "") as BridgeMessage;
    } catch {
      return;
    }
    for (const l of listeners) l(msg);
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
    startBridgeClient();
  }, backoffMs);
}

function setStatus(next: BridgeStatus): void {
  if (status === next) return;
  status = next;
  for (const l of statusListeners) l(status);
}

export function send(msg: BridgeMessage): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(msg));
  return true;
}

export function onMessage(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function onStatus(fn: StatusListener): () => void {
  statusListeners.add(fn);
  fn(status);
  return () => {
    statusListeners.delete(fn);
  };
}

export function getStatus(): BridgeStatus {
  return status;
}
