# Brief — `frontend-design` — Marketing Route

**Target:** `web/app/page.tsx` and all components under `web/app/components/` listed below.

## Context

You are building the marketing route (`/`) of the CSS Wrangler Chrome extension's landing page. The page is one scrolling column. Max width ~640px. No nav, no sidebar.

**Aesthetic:** Precision Instrument. Dark, monospace, dense, terse. Treat the marketing page as the extension panel scaled up. The product positioning is uncompromising.

## Hard rules — these are not negotiable

- No shadcn, no Radix, no headless UI library
- No Tailwind utility classes (Tailwind exists in this repo but is scoped strictly to `app/lab/tailwind/**`; using it on `/` is wrong)
- No CSS-in-JS (styled-components is scoped strictly to `app/lab/css-in-js/**`)
- No inline `style=` props except in tightly justified one-off cases (the marketing route should use CSS Modules end-to-end)
- No hex color literals — use `var(--…)` tokens only. The available tokens are listed in the appendix.
- No emoji, no exclamation points, no corporate copy patterns
- No icon libraries (Lucide, Heroicons, etc.). Hand-rolled inline SVGs only.
- No third-party scripts, fonts, or analytics
- No theme toggle (the page is dark only)

## Voice rules

- **Precision Instrument register.** Mono for selectors, values, code, file paths, version pills. Inter Tight for body prose only. Caps + tracking-caps for section labels and eyebrows. Title case for the headline. Sentence case for body.
- **Dry sarcasm, never insult.** The target of every joke is the industry, the old workflow, or the project itself — never the reader. Deadpan, world-weary, slightly amused at how things were before. If a line's only purpose is to be clever, cut it.
- **Banned words.** "powerful", "seamless", "elegant", "delightful", "magic", "love", "built different", "made with [emoji]"
- **Section labels stay straight.** Sarcasm reserved for body, tooltips, and the `/lab` description.

## Files to create

- `web/app/page.tsx` — composes the components below in order: TopBar → Hero → FeatureRow → PatchExample → InstallSection → Footer.
- `web/app/components/TopBar.tsx` (+ `TopBar.module.css`)
- `web/app/components/Hero.tsx` (+ `Hero.module.css`)
- `web/app/components/InstallCTA.tsx` (+ `InstallCTA.module.css`) — used inside Hero
- `web/app/components/FeatureRow.tsx` (+ `FeatureRow.module.css`)
- `web/app/components/PatchExample.tsx` (+ `PatchExample.module.css`)
  - For now, use a hardcoded JSON example matching the spec (see appendix). Phase 2 Task 11 swaps this for a real type-imported example with Shiki highlighting.
- `web/app/components/InstallSection.tsx` (+ `InstallSection.module.css`)
- `web/app/components/Footer.tsx` (+ `Footer.module.css`)
- `web/app/components/icons/Wordmark.tsx`, `GitHub.tsx`, `ExternalLink.tsx`, `CopyGlyph.tsx` — hand-rolled inline SVGs, 16×16, single-stroke schematic style. Stroke uses `currentColor`.

## Layout (single column, centered)

```
TopBar              hairline-bottom row · wordmark left · "v0.1 · ALPHA" right
Hero                eyebrow · 2-line mono headline · body · secondary line · CTAs
FeatureRow          three numbered cells · ·01 PICK · ·02 PREVIEW · ·03 PATCH
PatchExample        eyebrow · syntax-highlighted JSON · two trailing lines
InstallSection      eyebrow · three numbered mono command lines · closing line
Footer              hairline-top · build hash · deadpan single line
```

## Component-by-component copy and styling

### TopBar

- Wordmark, left: `// CSS WRANGLER` (mono, caps, tracking-caps, `var(--type-display)`, `var(--fg-primary)`).
- Right pill: `v0.1 · ALPHA` (mono, `var(--type-caption)`, `var(--fg-tertiary)`, padding `var(--sp-1) var(--sp-3)`, border `1px solid var(--border-hairline)`, `var(--radius-sm)`).
- Bottom border: `1px solid var(--border-hairline)`.
- Padding: `var(--sp-5) var(--sp-6)`.

### Hero

- Eyebrow: `PICK · TWEAK · SHIP` (mono, `var(--type-caption)`, tracking-caps, `var(--fg-tertiary)`).
- Headline (mono, ~32px desktop / ~24px mobile, `var(--leading-tight)`, `var(--tracking-tight)`, font-weight 500, two lines):
  > Edit any site's CSS  
  > and hand the diff to **Claude**.

  Wrap "Claude" in a span colored `var(--accent-signal)`. Nothing else on the page above the fold uses accent-signal.
- Body (Inter Tight, `var(--type-body)`, `var(--fg-secondary)`, max-width 60ch, line-height `var(--leading-normal)`):
  > A Chrome extension that turns visual CSS edits into a structured patch. Your AI agent applies it on the first try, which still feels like cheating.
- Secondary line (Inter Tight, `var(--type-caption)`, `var(--fg-tertiary)`):
  > The DevTools-edit-and-grep-and-pray loop, retired.
- Below the secondary line, render `<InstallCTA />`.
- Vertical rhythm: `var(--sp-7)` between eyebrow and headline; `var(--sp-6)` between headline and body; `var(--sp-3)` between body and secondary line; `var(--sp-7)` before InstallCTA.

### InstallCTA (rendered inside Hero)

Two buttons in a horizontal row with `var(--sp-4)` gap.

- **Primary (disabled-looking, but visible):**
  - Label: `▸ COMING SOON · CHROME WEB STORE` (the triangle is the literal character `▸`).
  - Type: a `<button type="button" disabled aria-disabled="true">`. `cursor: default`. No background fill; mono, `var(--type-label)`, tracking-caps, `var(--fg-secondary)`. Border: `1px solid var(--border-strong)`. Padding: `var(--sp-3) var(--sp-5)`. `var(--radius-sm)`.
  - Tooltip on hover (use a small custom CSS-only tooltip — render a sibling `<span>` positioned absolutely, hidden by default, shown on `:hover`/`:focus-visible` of the button):
    > Pending Chrome Web Store review. Allegedly imminent. Build from source meanwhile.
- **Secondary (linked, opens GitHub repo):**
  - Label: `▸ VIEW ON GITHUB`.
  - `<a href="https://github.com/kylekochanek/css-wrangler" target="_blank" rel="noreferrer noopener">`. Same typography as primary. Border: `1px solid var(--border-hairline)`. On hover: border becomes `var(--border-strong)`, color `var(--fg-primary)`. Transition: `var(--motion-fast) var(--ease-instrument)`.

### FeatureRow

Three equal cells in a CSS grid. Border-top + border-bottom hairline; vertical hairline between cells.

| | | |
|---|---|---|
| `·01 PICK` | `·02 PREVIEW` | `·03 PATCH` |
| Pick any element. Keyboard-navigable DOM walker. Works on any page. The fancy ones too. | Live preview via injected style + unique class. Wins specificity wars without asking. | Markdown-fenced JSON on your clipboard. Versioned. Agent-ready. Boringly stable. |

- Number (mono, `var(--type-caption)`, tracking-caps, `var(--fg-tertiary)`).
- Title (mono, `var(--type-data)`, `var(--fg-primary)`, font-weight 500). Same line as the number.
- Body (Inter Tight, `var(--type-caption)`, `var(--fg-secondary)`, line-height `var(--leading-normal)`).
- Cell padding: `var(--sp-6) var(--sp-5)`.
- Vertical divider between cells: `1px solid var(--border-hairline)`.

### PatchExample

- Eyebrow: `THE PATCH FORMAT · v1.0` (mono, `var(--type-caption)`, tracking-caps, `var(--fg-tertiary)`).
- Code block: a `<pre><code>` containing the JSON in the appendix. For Phase 2, hardcode the literal string. Phase 2 Task 11 swaps this for a Shiki-highlighted real example.
  - Container: `var(--bg-elev-1)` background, `1px solid var(--border-hairline)`, `var(--radius-sm)`, padding `var(--sp-5)`.
  - Code: `var(--font-mono)`, `var(--type-data)`, `var(--leading-tight)`, no syntax highlighting yet (uniform `var(--fg-primary)` is fine).
- Trailing lines (Inter Tight, `var(--type-caption)`, `var(--fg-secondary)`):
  > Versioned at 1.0. We're optimistic. Pattern-matched downstream by Claude Code; the shape doesn't change without a major bump.

### InstallSection

- Eyebrow: `INSTALL · v0.1 ALPHA`.
- Three steps in an `<ol>` rendered as a mono list (kill default decimals; render `·NN` as the marker).
  ```
  ·01  pnpm install && pnpm build
  ·02  chrome://extensions → developer mode → load unpacked → pick dist/
  ·03  click the toolbar icon, side panel opens, click PICK ELEMENT
  ```
  - Each step: mono, `var(--type-data)`, `var(--fg-primary)`. The `·NN` marker is `var(--fg-tertiary)`. Vertical gap between steps: `var(--sp-3)`.
- Closing line (Inter Tight, `var(--type-caption)`, `var(--fg-secondary)`):
  > When CSS Wrangler ships to the Chrome Web Store, this section becomes a single button. Until then, three steps. You'll live.

### Footer

- Hairline-top row.
- Left side (mono, `var(--type-caption)`, `var(--fg-tertiary)`):
  > // CSS WRANGLER · v0.1 · MIT · 2026 · github · /lab

  "github" links to the GitHub repo, "/lab" links to `/lab`.
- Right side (mono, `var(--type-caption)`, `var(--fg-quaternary)`):
  > · build a3f12c9

  The hash comes from `process.env.VERCEL_GIT_COMMIT_SHA` (or "local" in dev). Truncate to 7 chars. Render in a server component so the value is baked at build.
- Below the row (mono, `var(--type-micro)`, `var(--fg-quaternary)`, centered, padding-top `var(--sp-3)`):
  > No analytics. No telemetry. No newsletter. No Twitter.

## Page composition

`web/app/page.tsx` is a server component. Order:

```tsx
import { TopBar } from "./components/TopBar";
import { Hero } from "./components/Hero";
import { FeatureRow } from "./components/FeatureRow";
import { PatchExample } from "./components/PatchExample";
import { InstallSection } from "./components/InstallSection";
import { Footer } from "./components/Footer";

export default function HomePage() {
  return (
    <>
      <TopBar />
      <main>
        <Hero />
        <FeatureRow />
        <PatchExample />
        <InstallSection />
      </main>
      <Footer />
    </>
  );
}
```

`<main>` is `max-width: 640px; margin: 0 auto; padding: var(--sp-8) var(--sp-6)`.

## Appendix A — `DESIGN.md` reference

The full aesthetic source of truth is at `DESIGN.md` in the repo root. Read these specific sections directly before writing components: **Aesthetic**, **Colors**, **Typography**, **Layout**, **Elevation & depth**, **Shapes**, **Motion**, **Components**, **Microcopy**, **Do's and don'ts**. The hard rules above incorporate the bans from "Do's and don'ts" already; treat the rest as the visual language reference for any decision the brief leaves open.

## Appendix B — available tokens

The following CSS variables are available in `web/app/styles/tokens.css`. Use only these.

- `--fg-primary`, `--fg-secondary`, `--fg-tertiary`, `--fg-quaternary`
- `--bg-page`, `--bg-elev-1`, `--bg-elev-2`, `--bg-elev-3`
- `--border-hairline`, `--border-strong`
- `--accent-signal`, `--accent-signal-dim`, `--accent-applied`, `--accent-diverges`
- `--font-mono`, `--font-ui`, `--font-display`
- `--type-micro`, `--type-caption`, `--type-body`, `--type-data`, `--type-label`, `--type-section`, `--type-display`
- `--tracking-tight`, `--tracking-normal`, `--tracking-wide`, `--tracking-caps`
- `--leading-tight`, `--leading-normal`
- `--sp-0` through `--sp-9`
- `--radius-sm`, `--radius-md`
- `--motion-fast`, `--motion-base`, `--motion-slow`
- `--ease-instrument`
- `--noise-svg`

## Appendix C — placeholder Patch JSON

Use this literal content inside `<PatchExample />` for Phase 2. Phase 2 Task 11 replaces it with a real type-derived example.

```json
{
  "version": "1.0",
  "source": "css-wrangler",
  "url": "https://example.com",
  "capturedAt": "2026-05-03T17:42:11.000Z",
  "stylingSystem": "tailwind",
  "breakpoints": { "mobile": 640, "tablet": 768, "desktop": 1024 },
  "edits": [
    {
      "siblingGroup": null,
      "element": {
        "tag": "button",
        "text": "Get started",
        "role": "button",
        "ariaLabel": null,
        "selectors": [
          { "type": "class", "value": ".hero-cta", "stability": "high" }
        ],
        "domPath": "main > section.hero > button.hero-cta"
      },
      "changes": [
        { "property": "padding", "from": "12px 24px", "to": "16px 32px" }
      ]
    }
  ]
}
```

## Definition of done

- All listed files created.
- `pnpm web:typecheck` clean.
- `pnpm web:lint` clean.
- `pnpm web:build` clean.
- Visiting `/` in a browser shows the page in JetBrains Mono on the dark palette, with all copy verbatim from this brief.
- No hex literals in any `*.module.css` (verify with `grep -rE "#[0-9a-fA-F]{3,8}" web/app/components`).
- No console errors.
- No third-party domain requests in the Network tab.
