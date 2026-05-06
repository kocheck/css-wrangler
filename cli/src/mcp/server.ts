import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { PatchBus } from "../core/patch-bus";
import { registerApplyCssChangesPrompt } from "./prompts/apply-css-changes";
import { registerResources } from "./resources";
import { registerTools } from "./tools";

interface StartArgs {
  bus: PatchBus;
  isPanelConnected: () => boolean;
}

export async function startMcpServer({ bus, isPanelConnected }: StartArgs): Promise<McpServer> {
  const server = new McpServer({
    name: "css-wrangler",
    version: "0.1.0",
  });

  registerTools(server, { bus, isPanelConnected });
  registerResources(server, bus);
  registerApplyCssChangesPrompt(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
