import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PatchBus } from "../core/patch-bus";

export function registerResources(server: McpServer, bus: PatchBus): void {
  server.registerResource(
    "latest",
    "css-wrangler://latest",
    {
      title: "Latest CSS Wrangler patch",
      description:
        "The most recent patch pushed by the CSS Wrangler extension, as JSON. " +
        "Read-only mirror of `get_latest_patch` (no consume side-effect).",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(bus.latest(), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "history",
    "css-wrangler://history",
    {
      title: "Unapplied CSS Wrangler patches",
      description:
        "All patches whose capturedAt is newer than the applied-cursor, newest-first.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(bus.unapplied(), null, 2),
        },
      ],
    }),
  );
}
