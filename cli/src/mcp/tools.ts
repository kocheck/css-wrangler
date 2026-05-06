import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PatchBus, RING_CAPACITY } from "../core/patch-bus";

interface ToolDeps {
  bus: PatchBus;
  isPanelConnected: () => boolean;
}

function jsonResult(value: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function registerTools(server: McpServer, deps: ToolDeps): void {
  const { bus, isPanelConnected } = deps;

  server.registerTool(
    "get_latest_patch",
    {
      title: "Get latest CSS Wrangler patch",
      description:
        "Returns the most recent patch pushed by the CSS Wrangler extension, " +
        "or null if the queue is empty. Idempotent — call it any number of " +
        "times. Use `mark_patch_applied` after you've finished applying it.",
    },
    async () => jsonResult(bus.latest()),
  );

  server.registerTool(
    "get_patches",
    {
      title: "Get CSS Wrangler patch history",
      description:
        `Returns recent patches newest-first, capped at \`limit\` (default 20, ` +
        `max ${RING_CAPACITY}). Read-only. The buffer is in-memory; restart wipes it.`,
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(RING_CAPACITY)
          .optional()
          .describe(`Maximum number of patches to return (default 20, max ${RING_CAPACITY}).`),
      },
    },
    async ({ limit }) => jsonResult(bus.list(limit ?? 20)),
  );

  server.registerTool(
    "get_patch_status",
    {
      title: "Get CSS Wrangler queue status",
      description:
        "Returns `{ count, oldestAt, newestAt, panelConnected, appliedCursor }`.",
    },
    async () => jsonResult({ ...bus.status(), panelConnected: isPanelConnected() }),
  );

  server.registerTool(
    "clear_patches",
    {
      title: "Clear the CSS Wrangler patch queue",
      description: "Empties the in-memory queue. Returns the number cleared.",
    },
    async () => jsonResult({ cleared: bus.clear() }),
  );

  server.registerTool(
    "mark_patch_applied",
    {
      title: "Mark a CSS Wrangler patch as applied",
      description:
        "Advances the applied-cursor. With no arg, marks the most recent patch. " +
        "With `capturedAt`, marks that specific patch (must match an entry in " +
        "the queue). Returns `{ marked }` — the capturedAt that was marked, " +
        "or null if no match.",
      inputSchema: {
        capturedAt: z
          .string()
          .optional()
          .describe("ISO timestamp of the patch to mark as applied. Omit to mark the latest."),
      },
    },
    async ({ capturedAt }) => jsonResult({ marked: bus.markApplied(capturedAt) }),
  );
}
