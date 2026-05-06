import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { PatchBus } from "../core/patch-bus";
import { registerApplyCssChangesPrompt } from "./prompts/apply-css-changes";
import { registerResources } from "./resources";
import { registerTools } from "./tools";

export async function startMcpServer(bus: PatchBus): Promise<McpServer> {
  const server = new McpServer({
    name: "css-wrangler",
    version: "0.1.0",
  });

  registerTools(server, bus);
  registerResources(server, bus);
  registerApplyCssChangesPrompt(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
