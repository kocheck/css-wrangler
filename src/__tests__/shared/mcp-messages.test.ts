import { DEFAULT_BRIDGE_PORT } from "@shared/bridge-messages";
import { DEFAULT_MCP_PORT, DEFAULT_MCP_URL, MCP_PROTOCOL_VERSION } from "@shared/mcp-messages";
import { describe, expect, it } from "vitest";

describe("MCP message constants", () => {
  it("MCP port is 9124", () => {
    expect(DEFAULT_MCP_PORT).toBe(9124);
  });

  it("MCP port is distinct from bridge port", () => {
    expect(DEFAULT_MCP_PORT).not.toBe(DEFAULT_BRIDGE_PORT);
  });

  it("MCP URL is consistent with the port", () => {
    expect(DEFAULT_MCP_URL).toBe(`ws://localhost:${DEFAULT_MCP_PORT}`);
  });

  it("protocol version is 1.0", () => {
    expect(MCP_PROTOCOL_VERSION).toBe("1.0");
  });
});
