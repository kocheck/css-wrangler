# AGENTS.md

## Cursor Cloud specific instructions

### Quick reference

- **Canonical pre-PR gate:** `pnpm verify` (runs `typecheck && lint && test && cli:build && build`; ~30–45s).
- **Root lint:** `pnpm lint` (Biome, covers `src/`).
- **Web lint:** `pnpm web:lint` (Biome, covers `web/`).
- **Tests:** `pnpm test` (unit + integration via vitest, 166 tests). `pnpm test:unit` for fast feedback (~600ms), `pnpm test:integration` for daemon tests (~10s).
- **Typecheck:** `pnpm typecheck` (root), `pnpm web:typecheck` (web), `pnpm cli:typecheck` (CLI), `pnpm bridge:typecheck` (bridge), `pnpm figma:typecheck` (Figma plugin).
- Full details in `CLAUDE.md` and `README.md`.

### Services and ports

| Service | Command | Port | Notes |
|---|---|---|---|
| Vite dev (extension) | `pnpm dev` | 5174 (HMR 5175) | Panel HMR; content/SW need manual chrome://extensions reload |
| Next.js landing page | `pnpm web:dev` | 3000 | Separate `node_modules` in `web/`; install with `pnpm web:install` |
| MCP daemon | `WRANGLER_MCP_PORT=9124 node cli/dist/cli.js mcp` | 9124 | Build first: `pnpm cli:build`. Stdio MCP + WS receiver |
| Watch daemon | `node cli/dist/cli.js watch` | 9124 | Alternative to MCP; writes to `~/.css-wrangler/latest.json` |
| Bridge daemon | `pnpm bridge` | 9123 | Figma ↔ browser relay only |

MCP and Watch share port 9124 and are mutually exclusive — only run one at a time.

### Non-obvious caveats

- **Build scripts warning is cosmetic.** `pnpm install` shows "Ignored build scripts" for `@biomejs/biome` and `esbuild`. Both binaries still work; no action needed.
- **`web/` has independent deps.** Always run `pnpm web:install` after `pnpm install` to cover the Next.js landing page. They are not linked via pnpm workspaces.
- **Pre-push hook runs `pnpm verify`.** Set `WRANGLER_SKIP_VERIFY=1` or use `git push --no-verify` to bypass.
- **Chrome extension cannot be tested in headless Cloud Agent VMs.** The extension requires loading `dist/` as unpacked in Chrome with the Extensions API. State "verified at compile time only — runtime needs human verification" per `CLAUDE.md`.
- **Token regeneration:** If you touch `DESIGN.md` frontmatter, run `pnpm tokens` then `pnpm tokens:check` before committing.
