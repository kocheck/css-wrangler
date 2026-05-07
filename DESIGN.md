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
#
# Color schema (post-Radix migration):
#   colorScales:        list of @radix-ui/colors scales — hex values come
#                       from the npm package, NOT from this file. Update by
#                       `pnpm update @radix-ui/colors`.
#   colorAliases:       semantic name → "scale.step". Aliases preserve the
#                       existing public API (--fg-primary, --accent-signal,
#                       …) so consumer code doesn't churn.
#
# Mapping rule for the codegen (scripts/build-tokens.mjs):
#   colorScales[scale]    →  --<scale>-1 .. --<scale>-12  (dark in :root,
#                            light under [data-theme="light"])
#   colorAliases[name]    →  --<name>: var(--<scale>-<step>)
#   fonts.{name}          →  --font-{name}
#   type.{name}           →  --type-{name}
#   tracking.{name}       →  --tracking-{name}
#   leading.{name}        →  --leading-{name}
#   spacing.{name}        →  --sp-{name}     (section name = `spacing` per @google/design.md schema)
#   rounded.{name}        →  --radius-{name} (section name = `rounded` per @google/design.md schema)
#   motion.{name}         →  --motion-{name}
#   ease.{name}           →  --ease-{name}
# Sections `typography:` and `components:` are NOT codegen'd — they're rich
# documentation for design-tool consumers (Pencil, Figma plugins, etc.).
# ─────────────────────────────────────────────────────────────────────────

# Radix scales the panel + web pull in. Hex values live in
# @radix-ui/colors; this list just declares which ones we want.
colorScales:
  - sand        # neutrals (warm grayscale)
  - tomato      # signal / brand
  - grass       # applied / synced
  - amber       # diverges / warnings

# Semantic aliases: every name consumer code uses today. Each resolves to
# a scale step. Step 9 is Radix's "solid bg" step (mode-stable). Step 11
# is Radix's "low-contrast text" step (mode-aware) — used wherever an
# accent appears as text or icon on the page background.
colorAliases:
  fg-primary: sand.12        # high-contrast text · headlines
  fg-secondary: sand.11      # captions · metadata (AA against bg-page)
  fg-tertiary: sand.10       # hints · placeholders
  fg-quaternary: sand.7      # disabled (intentionally low contrast)
  bg-page: sand.1            # app background
  bg-elev-0: sand.2          # subtle row hover (Tier 2)
  bg-elev-1: sand.3          # cards
  bg-elev-2: sand.4          # nested surfaces
  bg-elev-3: sand.5          # inputs
  border-hairline: sand.6    # dividers
  border-strong: sand.7      # emphasis dividers
  border-focus: sand.9       # keyboard focus ring (≥ 3:1 against bg-page in both modes)
  accent-signal: tomato.9    # solid brand fill (PICK button, picker outline)
  accent-signal-dim: tomato.11  # brand text/icon — AA in both modes
  accent-applied: grass.11   # applied / synced text — AA in both modes
  accent-diverges: amber.11  # warning text — AA in both modes

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

Colors come from [Radix Colors](https://www.radix-ui.com/colors). Four
12-step scales — `sand` (neutrals), `tomato` (signal), `grass` (applied),
`amber` (diverges) — ship as raw `--<scale>-1` … `--<scale>-12` variables
in both modes. Semantic aliases (`--fg-primary`, `--accent-signal`, …)
resolve to specific steps. Components consume aliases by default; opt
into raw scales when an intermediate step is needed (hover state, active
state, custom border).

Why Radix: every step is engineered to a specific WCAG contrast against
its scale's step 1, so accessibility is built in. Step 9 is mode-stable
("solid bg" — brand color is the same in light and dark). Step 11 is
mode-aware ("low-contrast text" — flips correctly so accent text reads
on either background). Step 12 is "high-contrast text". Step 6 is
"subtle border". The role of each step is consistent across every scale.

Step roles in this project:

- `sand-1` → `bg-page` (app surface)
- `sand-2..5` → `bg-elev-0..3` (rising elevation)
- `sand-6..7` → `border-hairline` / `border-strong` (dividers)
- `sand-8` → `border-focus` (keyboard focus ring)
- `sand-7` → `fg-quaternary` (intentionally low — disabled only)
- `sand-10..12` → `fg-tertiary` / `fg-secondary` / `fg-primary`
- `tomato-9` → `accent-signal` (PICK button bg, picker outline)
- `tomato-11` → `accent-signal-dim` (brand text/icon, AA in both modes)
- `grass-11` → `accent-applied` (applied / synced, AA in both modes)
- `amber-11` → `accent-diverges` (warning text, AA in both modes)

`accent-signal` is sparingly applied — only to mean "this is live" or
"this is dangerous". If everything is orange, nothing is.

To change an accent's hue, pick a different Radix scale (e.g. swap
`tomato` for `red` or `crimson`) and update both `colorScales` and the
relevant `colorAliases` entries. To shift a token a step warmer or
cooler, change only its alias mapping (`fg-secondary: sand.10` instead
of `sand.11`). The Radix package is the only source of step hexes —
never hand-edit values.

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
