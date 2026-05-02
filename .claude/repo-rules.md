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
