# CLAUDE.md — `web/` landing page

> Read this first if you're touching anything under `web/`. The non-obvious
> rules below exist for reasons that aren't visible from the code.

## What this is

A Next.js 15 App Router app deployed to Vercel. Two routes:

- `/` — marketing surface for the CSS Wrangler Chrome extension.
- `/lab` — eight test stations that exist to exercise specific extension
  code paths. The lab is also the project's manual regression bench.

## The contract

If you change any of the following extension files, update or add a station
under `app/lab/` so the change has a regression target. The contract is
two-way: the stations exist BECAUSE these files exist; if a station's
purpose disappears, the station can be removed.

| Extension file | Stations exercising it |
|---|---|
| `src/content/picker.ts` (DOM walker, keyboard nav) | 06 deep-dom |
| `src/content/selectors.ts` (ranking + denylist + extractors) | 03 modules, 04 css-in-js, 05 inline |
| `src/content/styling-detect.ts` | 01 plain, 02 tailwind, 03 modules, 04 css-in-js |
| `src/content/injector.ts` (`!important` + unique class) | 08 important-wars |
| `src/content/observer.ts` (RAF-throttled MutationObserver) | 06 deep-dom |
| `src/panel/lib/tailwind-hint.ts` | 02 tailwind |
| Tier 2 force-state preview (`__force-hover`) | 02 tailwind |
| Tier 2 sibling-group detection | 07 shared-grid |

## Station map

| # | Path | Styling system | Tests |
|---|---|---|---|
| 01 | `/lab/plain` | hand-written CSS | baseline picker + selector ranking |
| 02 | `/lab/tailwind` | Tailwind v3 (scoped) | utility detection + value→utility hint + Tier 2 force-preview |
| 03 | `/lab/modules` | CSS Modules | mangled `Name_class__hash` extraction |
| 04 | `/lab/css-in-js` | styled-components v6 (scoped) | `sc-*` denylist + structural fallback |
| 05 | `/lab/inline` | inline styles only | structural-selector fallback on non-`<div>` tags |
| 06 | `/lab/deep-dom` | plain | walker + observer + `position: fixed` outline |
| 07 | `/lab/shared-grid` | plain | sibling-group detection |
| 08 | `/lab/important-wars` | plain + page-level `!important` | injector specificity invariant |

## Non-obvious rules

1. **Marketing-route components only consume tokens (`var(--…)`); no hex
   literals allowed.** Convention-only today; verify at PR review time
   with `grep -rE "#[0-9a-fA-F]{3,8}" web/app/components web/app/page.tsx`.
   The lab's per-station CSS files (`plain.css`, `important-wars.css`,
   etc.) are exempt — those ARE the styling under test. The
   `/design-system` tuning console is also exempt: its `tokens.ts`
   catalog mirrors `tokens.css` and uses literal hex values as the
   _defaults_ that the playground shows reset state against. The
   playground itself only consumes `var(--…)` — the literals are data,
   not styling. If you can't express a value with a token, add the
   token to `DESIGN.md` first.
2. **Tailwind is scoped strictly to `app/lab/tailwind/**`.**
   `tailwind.config.ts`'s `content` glob points only there; the compiled
   stylesheet is imported only by `app/lab/tailwind/layout.tsx`. Utility
   classes used elsewhere will not render — by design.
3. **styled-components is scoped strictly to `app/lab/css-in-js/**`.** The
   SSR registry lives at `app/lab/css-in-js/registry.tsx` and wraps that
   segment only.
4. **No icon libraries.** Hand-rolled inline SVGs only, in
   `app/components/icons/`. Same rule as the extension panel.
5. **No third-party scripts, fonts, or analytics at runtime.** Fonts are
   self-hosted via `next/font/local`. The Vercel build is the only place
   any third party is touched.
6. **No theme toggle.** `<html data-theme="dark">` only. The `colorsLight`
   palette is generated into `tokens.css` for future use, but nothing
   triggers it.
7. **`tokens.css` is AUTO-GENERATED.** Edit `DESIGN.md` frontmatter; run
   `pnpm tokens`. Both outputs (`src/panel/styles/tokens.css` and
   `web/app/styles/tokens.css`) regenerate together.

## Voice

- Precision Instrument register (mono numerals, terse labels, no marketing
  puff).
- Dry sarcasm aimed at the industry / old workflow / project itself, never
  at the reader.
- No emoji, no exclamation points.
- Section labels stay straight; sarcasm reserved for body, tooltips, and
  the `/lab` description.

## When in doubt

- Spec → `docs/superpowers/specs/2026-05-03-landing-page-design.md`
- Aesthetic / tokens → `DESIGN.md` (root)
- Extension architecture → `CLAUDE.md` (root)
- Build pipeline → `package.json` `web:*` scripts at the repo root
