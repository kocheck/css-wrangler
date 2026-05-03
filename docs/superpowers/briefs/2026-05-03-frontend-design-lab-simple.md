# Brief — `frontend-design` — Lab Index + Simple Stations

**Target:** `web/app/lab/page.tsx`, `web/app/components/StationFrame.tsx` (+ CSS module), and three station pages: `/lab/plain`, `/lab/inline`, `/lab/important-wars`.

## Context

You are building the index page for the CSS Wrangler extension's `/lab` route plus three of its eight test stations. The lab is a manual regression bench for the extension's picker, selector ranking, and injector. Each station exists to exercise a specific extension code path; the visible chrome (`<StationFrame />`) explains what's being tested so future visitors understand intent.

The marketing route at `/` is already built (Phase 2). The shared design language (Precision Instrument — dark, monospace, terse) carries over. `web/app/components/` already contains `TopBar`, `Hero`, `FeatureRow`, `PatchExample`, `InstallCTA`, `InstallSection`, `Footer`, and four icons (`Wordmark`, `GitHub`, `ExternalLink`, `CopyGlyph`).

The placeholder at `web/app/lab/page.tsx` should be replaced. Stations 02 (Tailwind), 03 (CSS Modules), 04 (CSS-in-JS), 06 (deep-dom), 07 (shared-grid) are NOT in this phase — Phase 4 builds them. The `/lab` index should still link to all eight stations; missing routes will 404 during dev, which is expected.

## Hard rules — these are not negotiable

- No shadcn, no Radix, no headless UI library
- No Tailwind utility classes (Tailwind exists in this repo but is scoped strictly to `app/lab/tailwind/**`; using it here is wrong — that station is Phase 4)
- No CSS-in-JS / styled-components (also Phase 4)
- No inline `style=` props in any component or station — use CSS Modules everywhere except `/lab/inline` where the inline styles ARE the test surface
- No hex color literals in `web/app/components/StationFrame.module.css` or `web/app/lab/lab-index.module.css` — use `var(--…)` tokens only. The `plain.css` and `important-wars.css` station files ARE permitted to use whatever values they want — those files exist to exercise the picker against realistic page CSS, not to be pristine token consumers.
- No emoji, no exclamation points, no corporate copy patterns
- No icon library imports
- No third-party scripts at runtime

## Voice rules

- **Precision Instrument register.** Same as the marketing route. Mono for selectors, station numbers, version pills, code. Inter Tight for body prose only.
- **Dry sarcasm, never insult.** The `/lab` index page leans into the dry register. The WHAT THIS TESTS box copy on each station is technical and matter-of-fact.
- **No emoji, no exclamation points** in user-facing copy.

## Files to create

### Shared component

- `web/app/components/StationFrame.tsx` (+ `StationFrame.module.css`)

### Lab index

- `web/app/lab/page.tsx` (+ `lab-index.module.css`)

  REPLACES the existing placeholder file at `web/app/lab/page.tsx`.

### Station 01 — `/lab/plain`

- `web/app/lab/plain/page.tsx`
- `web/app/lab/plain/plain.css` (raw CSS, NOT a module — this is intentional, it's the styling under test)

### Station 05 — `/lab/inline`

- `web/app/lab/inline/page.tsx`

  No CSS file — every style is `style="…"` inline, by design.

### Station 08 — `/lab/important-wars`

- `web/app/lab/important-wars/page.tsx`
- `web/app/lab/important-wars/important-wars.css` (raw CSS, NOT a module — this is the styling under test)

## `<StationFrame />`

Shared chrome around every `/lab/*` page. Used by stations 01, 05, 08 in this phase; reused by 02, 03, 04, 06, 07 in Phase 4.

### Component signature

```tsx
type Props = {
  stationNumber: string;     // "01", "02", ...
  stationName: string;       // "PLAIN CSS", "TAILWIND UTILITIES", ...
  testsBox: string;          // up to 3 lines, displayed in the top-right card
  children: React.ReactNode; // station body (the actual test surface)
};

export function StationFrame({ stationNumber, stationName, testsBox, children }: Props): JSX.Element;
```

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  STATION ·NN · NAME             ┌───────────────────────────┐   │
│                                 │ WHAT THIS TESTS           │   │
│                                 │ <up to 3 lines of testsBox>│   │
│                                 └───────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  {children}                     ← station body                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ← /lab                         ← bottom return link             │
└─────────────────────────────────────────────────────────────────┘
```

### Styling

- Top bar: hairline-bottom, padding `var(--sp-5) var(--sp-6)`. Position relative.
- `STATION ·NN · NAME`: mono, `var(--type-data)`, tracking-caps, `var(--fg-primary)`. The `·NN` portion in `var(--fg-tertiary)` so the contrast reads.
- `<aside>` "WHAT THIS TESTS" card pinned to the top-right corner of the top bar:
  - `position: absolute`, top + right anchored to the top bar.
  - Width ~280px, padding `var(--sp-4)`, `var(--bg-elev-1)` background, `1px solid var(--border-hairline)`, `var(--radius-sm)`.
  - Heading line: `WHAT THIS TESTS` (mono, `var(--type-caption)`, tracking-caps, `var(--fg-tertiary)`).
  - Body: `testsBox` rendered as plain text, mono, `var(--type-caption)`, `var(--fg-secondary)`, `var(--leading-normal)`. The `testsBox` string can contain backtick-fenced spans of code (e.g. `` `selectors.ts` ``) — render those inline; you can pass plain text and let the page consume any backticks visually as literal characters.
  - On viewports below 800px, the box drops below the title (stacks vertically) instead of pinning to the right.
- Body section: padding `var(--sp-7) var(--sp-6)`, max-width 960px, margin auto.
- Bottom return: hairline-top, padding `var(--sp-4) var(--sp-6)`. Render `<Link href="/lab">` (use `next/link`) showing `← /lab` (mono, `var(--type-caption)`, tracking-caps, `var(--fg-tertiary)`; on hover gets `var(--fg-primary)`).

The frame is a server component. No client interactivity.

## `/lab` index

REPLACES the placeholder at `web/app/lab/page.tsx`.

Top of page: `<TopBar />` from `web/app/components/` (re-use it). Below the top bar, a single column constrained to 960px, padding `var(--sp-9) var(--sp-6)`.

Page structure:

```tsx
<>
  <TopBar />
  <main className={styles.main}>
    <p className={styles.eyebrow}>THE LAB · CSS WRANGLER</p>

    <div className={styles.intro}>
      <p>
        This page exists to exercise every code path in the picker, selector ranking,
        denylist, styling-detect, injector, and observer across every styling system the
        extension supports. It also doubles as the regression harness, because writing
        tests for a Chrome extension is its own kind of misery.
      </p>
      <p>
        Open the side panel. Pick anything. Copy a patch. If a station behaves wrong,
        that station's source is your regression test. You're welcome.
      </p>
    </div>

    <hr className={styles.rule} />

    <ol className={styles.stations}>
      <li>
        <Link href="/lab/plain">
          <span className={styles.num}>·01</span>
          <span className={styles.name}>PLAIN CSS</span>
          <span className={styles.desc}>hand-written semantic classes</span>
        </Link>
      </li>
      {/* …all eight stations… */}
    </ol>

    <hr className={styles.rule} />

    <p className={styles.contract}>
      If you change <code>selectors.ts</code>, <code>injector.ts</code>, or
      <code>styling-detect.ts</code>, update or add a station. See
      <code>web/CLAUDE.md</code>. The contract is in writing for a reason.
    </p>
  </main>
  <Footer />
</>
```

The eight stations as a numbered list:

```
·01  PLAIN CSS              hand-written semantic classes
·02  TAILWIND UTILITIES     mass utility-class detection + hints
·03  CSS MODULES            mangled `Name_class__hash` extraction
·04  CSS-IN-JS              styled-components `sc-*` denylist
·05  INLINE STYLES          structural-selector fallback
·06  DEEP DOM               walker + observer + position:fixed
·07  SHARED-CLASS GRID      sibling-group detection
·08  IMPORTANT WARS         page-level !important — extension wins
```

Each row is a `<li>` containing a `<Link>`. The `·NN` is mono, `var(--fg-tertiary)`, fixed-width column. The `NAME` is mono, `var(--fg-primary)`, tracking-caps. The `desc` is Inter Tight, `var(--fg-secondary)`, `var(--type-caption)`. Three columns aligned via CSS grid (e.g. `grid-template-columns: 36px 220px 1fr`).

Hover on a row: background goes to `var(--bg-elev-1)`, no underline (the whole row is a link surface). Use `display: block` on the `<a>`.

`<hr>` rules: `border: 0; height: 1px; background: var(--border-hairline);` margin block `var(--sp-6)`.

The contract paragraph at the bottom uses Inter Tight for prose, mono for the inline `<code>` references. `var(--fg-tertiary)` color, `var(--type-caption)`.

Reuse `<Footer />` from the marketing route — same component, same build hash readout.

## Station 01 — `/lab/plain`

Page wraps content in `<StationFrame>`:

```tsx
<StationFrame
  stationNumber="01"
  stationName="PLAIN CSS"
  testsBox="Baseline. Hand-written classes, no framework. The picker should pick a single readable selector. styling-detect → plain."
>
  {/* test surface */}
</StationFrame>
```

Test surface (DOM):

- A `<section class="hero">` containing `<h1 class="hero__title">` and `<p class="hero__lede">`.
- A `<div class="cards">` containing two `<article class="card">` elements; the second has `class="card card--featured"`.
  - Each card has `<h3 class="card__title">`, `<p class="card__body">`, `<footer class="card__footer">`.
- A footer-style row at the bottom: `<div class="footer-row">` with three `<span class="footer-row__cell">` elements.

Realistic but not fancy copy in the cards (e.g. the cards advertise hypothetical product features — pick anything, this is just substrate for the picker).

Styling lives entirely in `web/app/lab/plain/plain.css`, imported by `page.tsx` directly via `import "./plain.css";`. Use realistic colors, real rounded corners (4–8px), real shadows — this is meant to feel like a normal hand-written CSS page that the user wrote pre-design-system. **Do NOT consume `var(--…)` tokens here**; this CSS is the styling under test, not part of the design system. Hex literals are FINE in `plain.css`.

The CSS should not visibly clash with the surrounding StationFrame chrome too much. A sensible neutral palette in the `plain.css` is fine. Avoid clashing oranges (the StationFrame's `accent-signal` shouldn't fight with anything in the test surface).

## Station 05 — `/lab/inline`

Page wraps content in `<StationFrame>`:

```tsx
<StationFrame
  stationNumber="05"
  stationName="INLINE STYLES"
  testsBox="No classes. The picker must build a structural selector. Form elements verify non-`<div>` fallback."
>
  {/* test surface */}
</StationFrame>
```

Test surface (DOM):

- A `<div>` grid (CSS grid layout via inline style) containing 4–6 `<div>` blocks, each with realistic inline styles (background color, padding, font-size, color). Each block has a `<span>` inside. **No `class=` attributes anywhere in the test surface.**
- Below the grid, a `<form>` containing:
  - `<label>` + `<input type="text" placeholder="username" />`
  - `<label>` + `<select>` with three `<option>` values
  - A `<button type="submit">SUBMIT</button>`
  - All inline-styled. No classes.

The grid blocks should LOOK distinct (varied colors, varied padding) so the picker has visual targets to hit. Inline styles are the test surface; the page should be ~100% inline `style=` props.

This is the only station file in the marketing route that's allowed to use inline styles. The lint warning about inline styles will not fire because Biome doesn't ban them by default; if it does, add a per-file Biome ignore at the top.

## Station 08 — `/lab/important-wars`

Page wraps content in `<StationFrame>`:

```tsx
<StationFrame
  stationNumber="08"
  stationName="IMPORTANT WARS"
  testsBox="Every rule on this page is `!important`. The extension's edits should still win. If they don't, invariant #2 is broken and so is the whole product. No pressure."
>
  {/* test surface */}
</StationFrame>
```

Test surface (DOM):

- A `<section class="hero">` with `<h1 class="hero-title">` and `<p class="hero-body">`.
- A `<button class="cta">CLICK ME</button>`.
- A `<article class="card">` with `<h3 class="card-title">` and `<p class="card-body">`.

Styling lives in `web/app/lab/important-wars/important-wars.css`. **Every rule must use `!important`** on color, padding, font-size, and background. The CSS is intentionally hostile to the extension — its job is to verify the injector wins.

Example for one selector (apply this pattern to every selector):

```css
.hero-title {
  color: #1a1a1a !important;
  background: #ffd700 !important;
  padding: 16px 24px !important;
  font-size: 28px !important;
}
```

Use realistic hostile colors (something the user might want to override — yellow on bright pink, anything visually loud) so when the user picks an element and edits the value, the difference is immediately visible if the injector wins. Hex literals are fine in this file.

## Page composition checklist

For each station file:

1. `import { StationFrame } from "@/app/components/StationFrame";`
2. Import the station's CSS file via `import "./plain.css";` (or equivalent).
3. Default-export an async server component (or sync if no async needed).
4. Wrap the test surface in `<StationFrame stationNumber stationName testsBox>{children}</StationFrame>`.

For the lab index:

1. Use `next/link` for all internal links (the eight station rows).
2. Reuse `<TopBar />` and `<Footer />` from `@/app/components/`.

## Definition of done

- All listed files created.
- `pnpm web:typecheck` clean.
- `pnpm web:lint` clean.
- `pnpm web:build` clean — should now show 5 routes prerendered as static: `/`, `/lab`, `/lab/plain`, `/lab/inline`, `/lab/important-wars`. (Plus `/_not-found`.)
- `/lab` index renders all 8 station rows; the three implemented (01, 05, 08) link to working pages, the other five (02, 03, 04, 06, 07) link to paths that 404 during dev (expected).
- Each station's `<StationFrame>` shows the right `STATION ·NN · NAME` heading and the right WHAT THIS TESTS box copy, verbatim from this brief.
- Station 08's CSS uses `!important` on every relevant property for every selector.
- No hex literals in `StationFrame.module.css`, `lab-index.module.css`, or any other component CSS module: `grep -rE "#[0-9a-fA-F]{3,8}" web/app/components/StationFrame.module.css web/app/lab/lab-index.module.css` returns no output. (Hex literals in `plain.css` and `important-wars.css` are EXPECTED and fine.)

## Appendix — `DESIGN.md` reference

`DESIGN.md` at the repo root is the aesthetic source of truth. Skim **Aesthetic**, **Colors**, **Typography**, **Layout**, **Elevation & depth**, **Shapes**, **Motion**, **Microcopy**, **Do's and don'ts** before designing `<StationFrame />`. The frame chrome should match the precision-instrument feel of the marketing route.

## Appendix — available tokens

(Same list as the marketing-route brief — see `web/app/styles/tokens.css` or the marketing-route brief's appendix B.)

Two tokens added in Phase 2 are also available: `--type-headline-sm` (24px), `--type-headline-lg` (32px). Probably not needed in the lab — its type stays small.
