import { MCP_PROTOCOL_VERSION } from "../../../src/shared/mcp-messages";
import type { Patch } from "../../../src/shared/types";

export type EnvelopeInspection =
  | { kind: "patch-pushed"; patch: Patch }
  | { kind: "invalid"; reason: string }
  | { kind: "unknown"; type: string };

export function inspectEnvelope(value: unknown): EnvelopeInspection {
  if (typeof value !== "object" || value === null) {
    return { kind: "invalid", reason: "message is not an object" };
  }
  const m = value as { type?: unknown; version?: unknown; patch?: unknown };
  if (typeof m.type !== "string") {
    return { kind: "invalid", reason: "message has no type field" };
  }
  if (m.type !== "patch-pushed") return { kind: "unknown", type: m.type };
  if (m.version !== MCP_PROTOCOL_VERSION) {
    return {
      kind: "invalid",
      reason: `protocol version mismatch (got ${JSON.stringify(m.version)}, expected ${MCP_PROTOCOL_VERSION})`,
    };
  }
  if (!isPatchShape(m.patch)) {
    return { kind: "invalid", reason: "patch-pushed message has malformed patch field" };
  }
  return { kind: "patch-pushed", patch: m.patch };
}

export function isPatchShape(value: unknown): value is Patch {
  if (typeof value !== "object" || value === null) return false;
  const p = value as { url?: unknown; capturedAt?: unknown; edits?: unknown };
  return typeof p.url === "string" && typeof p.capturedAt === "string" && Array.isArray(p.edits);
}
