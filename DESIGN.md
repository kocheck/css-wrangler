---
name: CSS Wrangler — Precision Instrument
version: alpha
description: >-
  A measurement-device aesthetic for the CSS Wrangler panel. Linear's density,
  Bloomberg Terminal's monospace numerals, schematic typography, analog
  mixing-console labeling. Calibrated, not retro, not skeuomorphic.

# ─────────────────────────────────────────────────────────────────────────
# Codegen contract
# ─────────────────────────────────────────────────────────────────────────
# This frontmatter is the source of truth for src/panel/styles/tokens.css.
# Run `pnpm tokens` to regenerate after edits. Run `pnpm tokens:check` in CI.
# Mapping rule for the codegen (scripts/build-tokens.mjs):
#   colors.{name}        →  --{name}                    (e.g. fg-primary, bg-page)
#   colorsLight.{name}   →  --{name} inside [data-theme="light"]
#   fonts.{name}         →  --font-{name}
#   type.{name}          →  --type-{name}
#   tracking.{name}      →  --tracking-{name}
#   leading.{name}       →  --leading-{name}
#   spacing.{name}       →  --sp-{name}     (section name = `spacing` per @google/design.md schema)
#   rounded.{name}       →  --radius-{name} (section name = `rounded` per @google/design.md schema)
#   motion.{name}        →  --motion-{name}
#   ease.{name}          →  --ease-{name}
# Sections `typography:` and `components:` are NOT codegen'd — they're rich
# documentation for design-tool consumers (Pencil, Figma plugins, etc.).
# ─────────────────────────────────────────────────────────────────────────

# Default (dark) palette
colors:
  fg-primary: "#fafaf7"
  fg-secondary: "#a8a8a3"
  fg-tertiary: "#6a6a66"
  fg-quaternary: "#3d3d3a"
  bg-page: "#0e0e10"
  bg-elev-1: "#131316"
  bg-elev-2: "#1a1a1e"
  bg-elev-3: "#232328"
  border-hairline: "#2a2a2e"
  border-strong: "#3d3d42"
  accent-signal: "#ff3d00"
  accent-signal-dim: "#b32a00"
  accent-applied: "#7ae582"
  accent-diverges: "#ffb800"

# Light-theme overrides (paired keys with `colors:` above)
colorsLight:
  fg-primary: "#0e0e10"
  fg-secondary: "#4a4a48"
  fg-tertiary: "#8a8a86"
  fg-quaternary: "#c0c0bc"
  bg-page: "#fafaf7"
  bg-elev-1: "#f3f3ee"
  bg-elev-2: "#ebebe5"
  bg-elev-3: "#e0e0d8"
  border-hairline: "#d6d6d0"
  border-strong: "#b8b8b2"

fonts:
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace'
  ui: '"Inter Tight", "Söhne", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  display: '"JetBrains Mono", ui-monospace, monospace'

type:
  micro: 9px
  caption: 10px
  body: 11px
  data: 12px
  label: 11px
  section: 10px
  display: 13px
  headline-sm: 24px
  headline-lg: 32px

tracking:
  tight: -0.01em
  normal: 0
  wide: 0.04em
  caps: 0.08em

leading:
  tight: 1.2
  normal: 1.4

# 4px baseline grid
spacing:
  "0": "0"
  "1": 2px
  "2": 4px
  "3": 6px
  "4": 8px
  "5": 12px
  "6": 16px
  "7": 20px
  "8": 24px
  "9": 32px

rounded:
  sm: 1px
  md: 2px

motion:
  fast: 60ms
  base: 120ms
  slow: 220ms

ease:
  instrument: "cubic-bezier(0.2, 0, 0, 1)"

# ─────────────────────────────────────────────────────────────────────────
# Rich documentation (not codegen'd to CSS)
# ─────────────────────────────────────────────────────────────────────────
# Type styles consumed by design tools that want full text-style objects.
typography:
  micro:
    fontFamily: "{fonts.mono}"
    fontSize: "{type.micro}"
    lineHeight: "{leading.tight}"
    letterSpacing: "{tracking.wide}"
  caption:
    fontFamily: "{fonts.mono}"
    fontSize: "{type.caption}"
    lineHeight: "{leading.tight}"
    letterSpacing: "{tracking.wide}"
  section-label:
    fontFamily: "{fonts.mono}"
    fontSize: "{type.section}"
    lineHeight: "{leading.tight}"
    letterSpacing: "{tracking.caps}"
  body:
    fontFamily: "{fonts.ui}"
    fontSize: "{type.body}"
    lineHeight: "{leading.normal}"
    letterSpacing: "{tracking.normal}"
  label:
    fontFamily: "{fonts.ui}"
    fontSize: "{type.label}"
    lineHeight: "{leading.tight}"
    letterSpacing: "{tracking.wide}"
  data:
    fontFamily: "{fonts.mono}"
    fontSize: "{type.data}"
    lineHeight: "{leading.tight}"
    letterSpacing: "{tracking.normal}"
    fontFeature: '"tnum" 1'
  display:
    fontFamily: "{fonts.display}"
    fontSize: "{type.display}"
    lineHeight: "{leading.tight}"
    letterSpacing: "{tracking.caps}"

# Component recipes (documentation; consumed by design-tool integrations).
components:
  button-pick:
    backgroundColor: "{colors.accent-signal}"
    textColor: "{colors.bg-page}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.4}"
  card:
    backgroundColor: "{colors.bg-elev-1}"
    textColor: "{colors.fg-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.5}"
  input:
    backgroundColor: "{colors.bg-elev-3}"
    textColor: "{colors.fg-primary}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: "{spacing.3}"
---

# DESIGN.md — CSS Wrangler

## How tokens flow

The YAML frontmatter above is the **single source of truth** for design
tokens. `src/panel/styles/tokens.css` is **generated** from it by
`scripts/build-tokens.mjs`.

```
DESIGN.md (frontmatter)
        │
        │  pnpm tokens
        ▼
src/panel/styles/tokens.css   ← AUTO-GENERATED. Do not hand-edit.
        │
        │  imported by panel/main.tsx
        ▼
panel UI consumes var(--…)
```

`pnpm tokens` regenerates the CSS. `pnpm tokens:check` regenerates to a
temp file and fails on any drift — wire this into CI. `pnpm dev` and
`pnpm build` both re-run codegen first.

To change a token: edit the frontmatter, run `pnpm tokens`, commit both
files together. Never edit `tokens.css` directly — it has a
`/* AUTO-GENERATED */` header for a reason.

## Aesthetic

Architectural precision meets calibration-tool restraint. The panel is a
measurement device, not a settings page. Influences: Linear's density,
Bloomberg Terminal's monospace numerals, schematic / blueprint typography,
analog mixing-console labeling. Not retro. Not skeuomorphic. The feel is
*calibrated*.

Every choice asks: would this be on a calibration tool? If the answer is no,
it doesn't ship.

## Colors

The palette splits into a high-contrast neutral spine and three semantic
accents. Foreground steps from `fg-primary` (text) through `fg-quaternary`
(disabled). Background steps `bg-page` → `bg-elev-3` for cards, expanded
edit bodies, and inputs.

- **`accent-signal` (#FF3D00):** PICK, destructive, active outline on the
  page. Used **sparingly** — only to mean "this is live" or "this is
  dangerous". If everything is orange, nothing is.
- **`accent-applied` (#7AE582):** Applied / synced edits, copy-success.
- **`accent-diverges` (#FFB800):** Diverges-from-token warnings.
- **`border-hairline` / `border-strong`:** Cool grays for dividers. No
  shadows.

## Typography

- **Mono (`JetBrains Mono`)** — all numerals, selectors, values, status
  pills. Tabular numerals (`font-variant-numeric: tabular-nums`) so columns
  don't wiggle.
- **UI (`Inter Tight`** falling back to system) — labels and help copy only.
- **Display** — same as mono. The wordmark uses uppercase + 0.08em tracking.

Type scale for the panel is small (9–13px). This is a tool, not a marketing page. The landing page at `/` (separate package) extends the scale with `headline-sm` (24px) and `headline-lg` (32px) for hero typography only — those tokens are not used in the panel.

## Layout

4px baseline. Tokens `spacing.1` through `spacing.9` cover the full
scale (2, 4, 6, 8, 12, 16, 20, 24, 32). Don't use raw px in components.

## Elevation & depth

`var(--border-hairline)` is the only divider. No box-shadows, no
glassmorphism, no gradients. The 2% SVG noise overlay (`var(--noise-svg)`,
not codegen'd — lives in `tokens.css.template`) is the only texture.

## Shapes

Border radii are 1–2px. Anything rounder reads as consumer SaaS, which this
isn't.

## Motion

- `--motion-fast: 60ms` — color swaps, hover state changes
- `--motion-base: 120ms` — card slide-in, expand/collapse
- `--motion-slow: 220ms` — reserved for the orchestrated page-load reveal
- `--ease-instrument: cubic-bezier(0.2, 0, 0, 1)` — sharp out, gentle in.
  No bounce.

## Components

- **`button-pick`** — the orange action. Mono label, tight padding, near-zero
  radius. Reserved for the picker entry point.
- **`card`** — elev-1 surface with hairline. Holds an edit row, a section
  group, or a panel section.
- **`input`** — elev-3 surface, mono data type, sm radius. Numerics get
  tabular numerals.

## Microcopy

Terse and instrument-like. Uppercase + wide tracking on labels. "PICK" not
"Select an element". "DIVERGES" not "This value isn't on the design scale".

## Do's and don'ts

This aesthetic forbids:

- Gradients (any direction, any opacity)
- Drop shadows
- Border-radius > 2px
- Emoji in UI
- Icons not hand-rolled (no Lucide, no Heroicons)
- Any color outside the tokens above
- Generic fonts (Inter, Roboto, Arial)

The picker uses the same `accent-signal` orange for the element outline. The
crosshair cursor and the small tag-name tooltip use the panel's monospace and
high-contrast palette so the in-page chrome reads as the same tool, not as a
different app.
