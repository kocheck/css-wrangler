#!/usr/bin/env node
import { runMcp } from "./commands/mcp";
import { runWatch } from "./commands/watch";

const HELP = `css-wrangler — CLI for the CSS Wrangler Chrome extension

USAGE
  css-wrangler <command> [flags]

COMMANDS
  mcp           Run the MCP server (stdio for Claude Code; WS receiver for the
                extension panel on localhost:9124).
  watch         Listen for panel pushes and write the latest patch atomically
                to ~/.css-wrangler/latest.json. Flags:
                  --port <n>      override WS receiver port
                  --path <file>   override output file

ENVIRONMENT
  WRANGLER_MCP_PORT    Override the WS receiver port (default 9124).
                       Both \`mcp\` and \`watch\` respect this. They listen on
                       the same default port and are alternatives — run one or
                       the other (or both on different ports via --port).
`;

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const rest = process.argv.slice(3);
  switch (cmd) {
    case "mcp":
      await runMcp();
      return;
    case "watch":
      await runWatch(rest);
      return;
    case undefined:
    case "-h":
    case "--help":
    case "help":
      process.stdout.write(HELP);
      return;
    default:
      process.stderr.write(`css-wrangler: unknown command "${cmd}"\n\n`);
      process.stderr.write(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`css-wrangler: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
