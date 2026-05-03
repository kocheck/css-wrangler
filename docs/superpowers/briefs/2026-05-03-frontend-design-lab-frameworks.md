# Brief — `frontend-design` — Lab Framework Stations (Phase 4)

**Target:** Five test stations under `web/app/lab/` — `tailwind`, `modules`, `css-in-js`, `deep-dom`, `shared-grid`. Plus an update to `web/app/lab/page.tsx` to flip the five `pending: true` entries to live links.

## Context

You're building five test stations for the CSS Wrangler Chrome extension's regression bench. Each station deliberately uses a different styling system or DOM pattern to exercise specific extension code paths (selectors, denylist, styling-detect, observer, sibling-group detection).

The shared `<StationFrame />` chrome is already built and battle-tested in Phase 3 (used by stations 01, 05, 08). Reuse it. The frame handles the TopBar, title row, WHAT THIS TESTS band, body, and back-to-lab button — you don't touch any of that.

The marketing route at `/` and three lab stations (`/lab/plain`, `/lab/inline`, `/lab/important-wars`) are already live. The `/lab` index lists all eight stations; five of them are currently rendered as `PENDING` rows. After this phase, all eight should be live links.

**Tailwind v3 is already scaffolded** at `web/tailwind.config.ts` (content glob: `app/lab/tailwind/**/*.{ts,tsx}`), `web/postcss.config.js`, and `web/app/lab/tailwind/tailwind.css` (the `@tailwind base/components/utilities` directives). Just import it in your tailwind layout.

**styled-components v6 SSR registry is already scaffolded** at `web/app/lab/css-in-js/registry.tsx` and `web/app/lab/css-in-js/layout.tsx`. The Next.js `compiler.styledComponents` flag is enabled. Just create your styled definitions in a client component under that segment.

## Hard rules — non-negotiable

- **Tailwind utility classes are PERMITTED ONLY inside `app/lab/tailwind/**`.** Anywhere else they won't compile (the content glob skips them).
- **styled-components is PERMITTED ONLY inside `app/lab/css-in-js/**`.** The SSR registry only wraps that segment.
- **CSS Modules required for the modules station** — the whole point is to generate hashed class names like `Modules_heroTitle__abc12`.
- **Hex literals are PERMITTED in test-surface CSS files** (`tailwind.css`, `Modules.module.css`, `important-wars.css`). The marketing-route hex ban doesn't apply inside the lab — these files ARE the styling under test.
- **No icon libraries.** Hand-rolled SVG only if needed (probably not needed here).
- **No emoji, no exclamation points** in copy.
- **No `"use client"` outside the css-in-js station.** Tailwind, modules, deep-dom, shared-grid are server-rendered. The deep-dom station has a ticker that needs `useEffect` — that one IS a client component, but isolate it tightly (e.g. a small `<DeepDomTicker />` client component embedded in an otherwise-server page).
- **`<StationFrame>` wraps every station body.** Same prop signature: `{ stationNumber, stationName, testsBox, children }`.

## Voice rules

Same as Phase 3: precision-instrument register, dry sarcasm in WHAT THIS TESTS prose where appropriate, no emoji, no exclamation points.

## Files to create

### Station 02 — `/lab/tailwind`

- `web/app/lab/tailwind/layout.tsx` — segment layout that imports `./tailwind.css`. Wrap children unchanged.
- `web/app/lab/tailwind/page.tsx` — server component. Uses `<StationFrame>` and inside it renders Tailwind-styled markup.

**Test surface (DOM):**

A pricing-card grid + a hero card with a utility wall + an interactive button. Specifically:

1. **Hero card** — a `<section>` with a wall of utility classes:
   `bg-zinc-900 text-zinc-50 ring-1 ring-zinc-800/60 px-6 py-4 rounded-md`
   Inside: an `<h2>` and a `<p>` with their own utility classes (`text-2xl font-semibold tracking-tight`, `text-sm text-zinc-400 mt-2 max-w-prose`).

2. **Pricing-card grid** — a 3-column CSS grid via `grid grid-cols-3 gap-4` with three `<article>` cards, each:
   - `bg-zinc-950 ring-1 ring-zinc-800 rounded-lg p-6 hover:ring-zinc-700 transition`
   - Inside: tier name, price (large), feature list. Realistic mock content.
   - Use varied utility classes between cards so the picker has different selectors to land on.

3. **Interactive button** — a `<button>` with REAL hover/focus utilities:
   `bg-zinc-100 text-zinc-900 hover:bg-zinc-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-50 px-4 py-2 rounded-md font-medium transition`
   The `hover:` and `focus-visible:` variants are deliberate — they're the test substrate for Tier 2 force-state preview in the extension. Label text: "Subscribe".

**`testsBox` copy:**
> "Tailwind. Mass utility classes; the panel must show value→utility hints. Force-preview must work against real Tailwind hover/focus rules. styling-detect → tailwind."

**`stationNumber`:** `02`. **`stationName`:** `TAILWIND UTILITIES`.

### Station 03 — `/lab/modules`

- `web/app/lab/modules/page.tsx` — server component using `<StationFrame>`.
- `web/app/lab/modules/Modules.module.css` — at least four distinct class definitions: `.heroTitle`, `.heroBody`, `.cardLabel`, `.cardValue`. Plus any structural classes you need (`.hero`, `.card`, `.cardRow`).

**Test surface:** A small dashboard-style page. Hero with title + body, then a row of metric cards (each with a label + value). Style them realistically with the CSS Module — colors, spacing, typography that look like a real dashboard.

The point: when this renders, classes hash like `Modules_heroTitle__a1b2c`. The extension's `extractCssModulesName` must strip the hash and return `heroTitle` as the meaningful selector. False positives from the denylist are catastrophic — DON'T add classes that look mangled to a regex but aren't.

**`testsBox` copy:**
> "CSS Modules. Mangled `Name_class__hash` → meaningful selector. The denylist must extract, not reject."

**`stationNumber`:** `03`. **`stationName`:** `CSS MODULES`.

### Station 04 — `/lab/css-in-js`

The SSR registry layout already exists at `web/app/lab/css-in-js/layout.tsx`. You don't touch that.

- `web/app/lab/css-in-js/page.tsx` — server component using `<StationFrame>`. Imports the styled components from a separate client file.
- `web/app/lab/css-in-js/components.tsx` — `"use client";` file with all the `styled.*` definitions. Export them so the page renders them.

**Test surface:** A small product card with:
1. `<StyledCard>` wrapper (padding, background, border).
2. `<StyledTitle>` (heading).
3. `<StyledBody>` (paragraph).
4. **`<StyledButton $variant="primary" | "secondary">`** — the variant prop is critical. Render TWO buttons on the page: one primary, one secondary. They must produce different `sc-*` class names (styled-components hashes vary by props), which is what exercises the denylist.

Use realistic colors and styles — make it look like a real product card.

**`testsBox` copy:**
> "styled-components. Auto-generated `sc-*` classes are unreliable; the picker should not select on them."

**`stationNumber`:** `04`. **`stationName`:** `CSS-IN-JS`.

### Station 06 — `/lab/deep-dom`

- `web/app/lab/deep-dom/page.tsx` — mostly a server component, but contains a small client component for the ticker.
- `web/app/lab/deep-dom/DeepDomTicker.tsx` — `"use client";` file. A `<span>` whose `textContent` mutates every 2 seconds via `useEffect` + `setInterval`. **Must clear the interval on unmount** — verify with the cleanup return from `useEffect`.
- `web/app/lab/deep-dom/SubtreeToggle.tsx` — `"use client";` file. A button + a managed subtree of elements. Clicking the button toggles the subtree's child IDs and order (via `useState`). The subtree should re-render with different DOM keys so the observer has to handle real mutation.

**Test surface (the page composes):**

1. **Fixed-position header bar** at the top of the page (NOT the StationFrame's TopBar — an additional `<header style="position: fixed; top: 0; left: 0; right: 0; ...">` INSIDE the StationFrame body). It contains a `<DeepDomTicker />`.
   - Use plain CSS via a tiny `web/app/lab/deep-dom/deep-dom.css` import (or inline styles, your call). `position: fixed` is the test substrate — picker outline positioning over fixed elements.
   - Make sure the StationFrame's chrome stays interactive; the fixed header should be visually distinct so it's clearly the test surface, not the chrome.
2. **An 8-level nested tree** — a `<section>` with deep `<div>` nesting. Each level has a different background tint or padding. Inside the deepest level, a `<button>` and a couple of `<span>` text elements. The point: the picker's keyboard nav (↑/↓ to walk ancestors) needs depth.
3. **A `<SubtreeToggle />`** somewhere visible — a button + the subtree of items it manages. Clicking should reorder/relabel items, exercising the MutationObserver.

**`testsBox` copy:**
> "Deep DOM + live mutations + fixed-positioned header. The picker must walk ancestors. The observer must re-apply our class without thrashing. Outlines must position correctly over fixed elements."

**`stationNumber`:** `06`. **`stationName`:** `DEEP DOM`.

### Station 07 — `/lab/shared-grid`

- `web/app/lab/shared-grid/page.tsx` — server component using `<StationFrame>`.
- `web/app/lab/shared-grid/shared-grid.module.css` — styles for the cards.

**Test surface:** **Exactly twelve** `<article className={styles.card}>` items. Each card has identical inner structure:
1. A placeholder image `<div className={styles.image} />` (no actual image; just a colored block).
2. An `<h3 className={styles.title}>` with realistic mock title.
3. A `<p className={styles.body}>` with realistic mock body.
4. A `<footer className={styles.footer}>` with a small label like "READ MORE" or a date.

The titles and bodies should differ across cards (real-looking content) so the page doesn't look like a copy-paste error — but the structure and class names must be identical across all 12.

Layout: `display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-5);` so it's a 3-column grid that wraps.

**`testsBox` copy:**
> "Twelve siblings, one shared class. Edits should propose a sibling group; the patch should set `siblingGroup`, not `null`."

**`stationNumber`:** `07`. **`stationName`:** `SHARED-CLASS GRID`.

### Update to `/lab` index

In `web/app/lab/page.tsx`, the `STATIONS` array has five entries with `pending: true`. Flip them all to built-station entries with their proper `href`:

- `02 TAILWIND UTILITIES` → `href: "/lab/tailwind"`
- `03 CSS MODULES` → `href: "/lab/modules"`
- `04 CSS-IN-JS` → `href: "/lab/css-in-js"`
- `06 DEEP DOM` → `href: "/lab/deep-dom"`
- `07 SHARED-CLASS GRID` → `href: "/lab/shared-grid"`

Remove the `pending: true` flags. The TypeScript discriminated union should naturally narrow to the `BuiltStation` shape once `pending` is gone.

## Definition of done

- All 10 listed files created (5 stations × ~2 files each, plus updates to lab index).
- `pnpm web:typecheck` clean.
- `pnpm web:lint` clean.
- `pnpm web:build` clean — should now show 10 routes prerendered: `/`, `/lab`, `/lab/plain`, `/lab/inline`, `/lab/important-wars`, `/lab/tailwind`, `/lab/modules`, `/lab/css-in-js`, `/lab/deep-dom`, `/lab/shared-grid` (plus `/_not-found`).
- The `/lab` index has zero `PENDING` rows — all eight stations are clickable.
- **Tailwind isolation check:** `curl -s http://localhost:3000 | grep -E "bg-zinc"` returns nothing (no Tailwind utilities on `/`); `curl -s http://localhost:3000/lab/tailwind | grep -E "bg-zinc"` returns matches (utilities present on `/lab/tailwind`).
- **styled-components SSR check:** `curl -s http://localhost:3000/lab/css-in-js | grep -E "sc-[a-z0-9]"` returns at least one `sc-*` class (proving SSR worked, no FOUC).
- **No `"use client"` outside the css-in-js station and the deep-dom client components.** Verify: `grep -r "use client" web/app/lab/ web/app/components/` should match only `app/lab/css-in-js/registry.tsx`, `app/lab/css-in-js/components.tsx`, and the two client components under `app/lab/deep-dom/`.
- **No Tailwind classes outside the tailwind station:** `grep -rE "(class|className)=\"[^\"]*(?:bg-zinc|text-zinc|grid-cols-)" web/app/lab/ --exclude-dir=tailwind` should return no matches.

## Appendix — `DESIGN.md` reference

`DESIGN.md` is the aesthetic source of truth. The lab stations don't strictly conform to its precision-instrument palette (they ARE the test surfaces — they need to look like real-world non-extension UIs). But the StationFrame chrome around them follows DESIGN.md. Don't accidentally apply precision-instrument styling to the test surfaces; they should look like the products users actually need to edit (Tailwind landing pages, CSS-Modules dashboards, styled-components product cards, deeply nested news sites, content grids).

## Appendix — available shared tokens

If you need to reference design tokens (e.g. for the deep-dom fixed header that needs to feel "like part of the page"), `web/app/styles/tokens.css` lists them. But you probably don't — these stations are the styling under test, NOT the design system.
