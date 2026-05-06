# Repo Rules — CSS Wrangler

Source of truth for the `tidy-repo` skill.

## Allowed at root

Only these files (and dotfiles) belong at the repo root.

- README.md
- LICENSE
- CLAUDE.md
- DESIGN.md
- package.json
- pnpm-lock.yaml
- tsconfig.json
- vite.config.ts
- biome.json
- vercel.json

(dotfiles like `.gitignore`, `.env*`, `.claude/` are always allowed at root)

## Directory purposes

- `src/` — extension source. Sub-trees: `background/` (service worker),
  `content/` (in-page TS), `panel/` (React side panel), `shared/` (types,
  messages, constants), `assets/` (icons, fonts).
- `scripts/` — build-time codegen and maintenance scripts (e.g.
  `build-tokens.mjs`, `tokens.css.template`).
- `dist/` — Vite build output. Gitignored. Loaded as the unpacked extension.
- `node_modules/` — package install. Gitignored.
- `.claude/` — Claude session context (repo-rules, about-me, etc.).
- `.context/` — Conductor agent scratch (gitignored).
- `web/` — Next.js landing page (Vercel-hosted). Marketing route + `/lab`
  test-station bench. See `web/CLAUDE.md` for landing-page conventions.
  Independent `node_modules` and `pnpm-lock.yaml` (no workspaces).
- `cli/` — `@css-wrangler/cli` workspace. `css-wrangler mcp` (MCP server
  for Claude Code) and `css-wrangler watch` (file-on-disk fallback).
  Shared `cli/src/core/` modules; subcommand entry points in
  `cli/src/commands/`. See `cli/README.md` and `cli/CONTRACT.md`.

## Routing rules

- Design tokens → edit `DESIGN.md` frontmatter; `tokens.css` is generated.
- Build/maintenance scripts → `scripts/`
- Brain dumps, scratch notes, screenshots → `.context/` (do not commit)
- Architecture decisions / ADRs → `docs/decisions/` (create when needed)
- Long-form docs → `docs/`

## Forbidden patterns

Never tracked in git.

- `NOTES.md`
- `TODO.md`
- `scratch.md`
- `untitled*`
- `*.tmp`, `*.bak`, `*.swp`
- `.DS_Store`
- `Thumbs.db`
- `dist/` (must be gitignored)
- `node_modules/` (must be gitignored)

## Exceptions

(none)
