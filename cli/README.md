# `@css-wrangler/cli`

A small CLI that exposes CSS Wrangler patches to outside consumers — primarily
Claude Code, via the Model Context Protocol.

The browser extension still works the same way. This CLI is **additive**: the
panel keeps writing patches to the clipboard like it always did, *and* now
also pushes them to a localhost daemon if one is running. If you're not using
Claude Code, you don't need this at all.

## Subcommands

| Command | Status |
|---|---|
| `css-wrangler mcp` | ready — runs the MCP server (stdio for Claude Code, WS receiver for the panel on `localhost:9124`). |
| `css-wrangler watch` | ready — listens on the same port and writes the latest patch atomically to `~/.css-wrangler/latest.json`. See [`CONTRACT.md`](./CONTRACT.md) for the file-on-disk contract. |

## Setup for Claude Code

```bash
# 1. Build the binary once.
pnpm cli:build

# 2. Add this to your project's .mcp.json (use the absolute path).
{
  "mcpServers": {
    "css-wrangler": {
      "command": "node",
      "args": ["/absolute/path/to/css-wrangler/cli/dist/cli.js", "mcp"]
    }
  }
}
```

If you'd rather link it into your `$PATH`:

```bash
cd cli && npm link
# Then in .mcp.json:
# "command": "css-wrangler", "args": ["mcp"]
```

## Usage

1. Open Claude Code in any repo with the `.mcp.json` above.
2. Open the CSS Wrangler extension in Chrome on the page you want to edit.
3. Pick an element, edit, click **Copy patch**.
4. In Claude Code: *"apply the latest CSS wrangler patch"* — Claude calls the
   `get_latest_patch` tool, reads the JSON, and applies it following the
   standard CSS Wrangler instructions (DRY, prefer tokens, honor
   `siblingGroup`, etc.).

## MCP surface

**Tools**

| Tool | Args | Returns |
|---|---|---|
| `get_latest_patch` | — | the most recent `Patch` (JSON) or `null`. **Idempotent** — does not advance the cursor. |
| `get_patches` | `{ limit?: number = 20 }` | newest-first array, max 50. |
| `get_patch_status` | — | `{ count, oldestAt, newestAt, panelConnected, appliedCursor }`. |
| `clear_patches` | — | `{ cleared: number }`. |
| `mark_patch_applied` | `{ capturedAt?: string }` | `{ marked: string \| null }`. No arg = mark the most recent. |

**Resources**

| URI | Body |
|---|---|
| `css-wrangler://latest` | Latest `Patch` JSON or `null`. |
| `css-wrangler://history` | Patches whose `capturedAt` is newer than `appliedCursor`. |

**Prompts**

| Name | Effect |
|---|---|
| `apply-css-changes` | Pre-templated prompt that fetches the latest patch and applies it under the standard CSS Wrangler rules. Equivalent to today's "paste the markdown" flow, minus the paste. |

## State

`mcp` keeps an in-memory ring buffer, capacity 50. When full, the **oldest**
patch is dropped to make room for the newest. Restart wipes everything (CLAUDE.md
invariant 1). For persistence, run `css-wrangler watch` instead — it writes the
latest patch atomically to disk and forgets earlier ones.

`mcp` and `watch` listen on the same default port (`9124`). The panel pushes to
a single port, so for v1 they're **alternatives** — run one or the other. If
you need both running at once, run `watch --port <other>` and put `mcp` on the
default; you'll need a panel-side change to push to both ports (not yet
implemented). Note: `mcp` reads `WRANGLER_MCP_PORT` only — it has no `--port`
flag. `watch` accepts both.

## Watch — file-on-disk path

```bash
css-wrangler watch                          # writes ~/.css-wrangler/latest.json
css-wrangler watch --path ./patch.json      # workspace-relative
css-wrangler watch --port 9125              # alternate port (panel must push to it)
```

The output file is overwritten atomically (temp file + rename) on every
push. Last write wins; there's no history. Full contract documented in
[`CONTRACT.md`](./CONTRACT.md).

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `WRANGLER_MCP_PORT` | `9124` | Localhost port the panel pushes to. Both `mcp` and `watch` respect it. Distinct from the bridge daemon's `9123`. |

## Development

```bash
pnpm cli mcp                # run via tsx (no build needed)
pnpm cli:typecheck          # tsc --noEmit
pnpm cli:build              # esbuild bundle → cli/dist/cli.js
```

## Patch format

The patch JSON shape is defined in `src/shared/types.ts:Patch`. The contract
is documented in the root README and (eventually) `cli/CONTRACT.md`. Tools
return raw `Patch` objects — no MCP-side wrapping.
