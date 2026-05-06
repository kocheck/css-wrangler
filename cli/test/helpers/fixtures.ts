import WebSocket from "ws";
import {
  MCP_PROTOCOL_VERSION,
  PATCH_PUSHED_TYPE,
} from "../../../src/shared/mcp-messages";
import type { Patch } from "../../../src/shared/types";

export function makePatch(overrides: Partial<Patch> = {}): Patch {
  return {
    version: "1.0",
    source: "css-wrangler",
    url: "https://example.com",
    capturedAt: "2026-05-06T18:00:00.000Z",
    stylingSystem: "plain",
    breakpoints: { mobile: 375, tablet: 768, desktop: 1280 },
    edits: [],
    ...overrides,
  };
}

/**
 * Open a WebSocket to the MCP daemon, send one patch-pushed message, close.
 * Resolves once the message has been written and the socket is closed.
 */
export function pushPatch(port: number, patch: Patch, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const t = setTimeout(() => reject(new Error("ws timeout")), timeoutMs);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: PATCH_PUSHED_TYPE, version: MCP_PROTOCOL_VERSION, patch }));
      setTimeout(() => {
        ws.close();
        clearTimeout(t);
        resolve();
      }, 100);
    });
    ws.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

/**
 * Send a raw envelope (used by the malformed-message tests).
 */
export function pushRaw(port: number, envelope: unknown, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const t = setTimeout(() => reject(new Error("ws timeout")), timeoutMs);
    ws.on("open", () => {
      ws.send(JSON.stringify(envelope));
      setTimeout(() => {
        ws.close();
        clearTimeout(t);
        resolve();
      }, 80);
    });
    ws.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}
