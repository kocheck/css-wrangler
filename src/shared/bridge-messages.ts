import type { PropertyChange } from "./types";

export const DEFAULT_BRIDGE_PORT = 9123;
export const DEFAULT_BRIDGE_URL = `ws://localhost:${DEFAULT_BRIDGE_PORT}`;
export const BRIDGE_PROTOCOL_VERSION = "1.0";

export type BridgeClientKind = "figma" | "panel";

export interface TargetRef {
  /** human-readable name for the *other* side's UI to display */
  display: string;
  kind: "dom" | "figma-node";
  /** opaque to the bridge; never resolved by the relay */
  id: string;
}

export interface HelloMsg {
  type: "hello";
  client: BridgeClientKind;
  version: typeof BRIDGE_PROTOCOL_VERSION;
}

export interface PushChangesMsg {
  type: "push-changes";
  from: BridgeClientKind;
  target: TargetRef;
  changes: PropertyChange[];
}

export interface EchoMsg {
  type: "echo";
  from: BridgeClientKind;
  target: TargetRef | null;
}

export interface AckMsg {
  type: "ack";
  for: "push-changes";
  ok: boolean;
  appliedTo: TargetRef | null;
  reason?: string;
}

export type BridgeMessage = HelloMsg | PushChangesMsg | EchoMsg | AckMsg;
