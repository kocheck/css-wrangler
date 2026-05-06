import type { Patch } from "./types";

export const MCP_PROTOCOL_VERSION = "1.0";
export const DEFAULT_MCP_PORT = 9124;
export const DEFAULT_MCP_URL = `ws://localhost:${DEFAULT_MCP_PORT}`;

export const PATCH_PUSHED_TYPE = "patch-pushed";

export interface PatchPushedMsg {
  type: typeof PATCH_PUSHED_TYPE;
  version: typeof MCP_PROTOCOL_VERSION;
  patch: Patch;
}

export type McpMessage = PatchPushedMsg;
