import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderInstructionsMarkdown } from "../../../../src/shared/patch-instructions";

const PROMPT_BODY = `You are applying a CSS Wrangler patch to the source.

Step 1 — fetch the patch by calling the \`get_latest_patch\` MCP tool. If it
returns null, ask the user to click "Copy patch" in the extension and try again.

Step 2 — apply the patch following these rules verbatim:

${renderInstructionsMarkdown()}

Step 3 — when the edits are committed to the source, call \`mark_patch_applied\`
with no arguments to advance the applied-cursor.`;

export function registerApplyCssChangesPrompt(server: McpServer): void {
  server.registerPrompt(
    "apply-css-changes",
    {
      title: "Apply latest CSS Wrangler patch",
      description:
        "Fetches the latest patch from the MCP server and applies it to the " +
        "source, following the standard CSS Wrangler instructions (DRY, prefer " +
        "tokens, honor siblingGroup, etc.).",
    },
    async () => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: PROMPT_BODY },
        },
      ],
    }),
  );
}
