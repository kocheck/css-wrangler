# Landing page design — `web/`

**Status:** approved (brainstorming complete; awaiting `writing-plans`)
**Date:** 2026-05-03
**Owner:** Kyle Kochanek
**Branch:** `landing-page`
**Target:** `origin/main`

## Goal

Ship a Vercel-hosted Next.js landing page for the CSS Wrangler Chrome extension that does two jobs at once:

1. **Marketing surface** — a single-route pitch at `/` aligned with the project's "Precision Instrument" aesthetic, ending in an install CTA that links to the Chrome Web Store once published.
2. **Test bed** — a `/lab` route hosting eight test stations, each one engineered to exercise a specific extension code path (picker, selector ranking, denylist, `styling-detect`, injector, observer, sibling-group detection, `!important` specificity).

The landing page also serves as the project's manual regression harness: changing `selectors.ts`, `injector.ts`, or `styling-detect.ts` requires updating or adding a station, and the contract is documented in `web/CLAUDE.md` so future sessions don't lose it.

## Non-goals (v0)

- Newsletter / email capture
- Analytics, telemetry, third-party scripts
- Light theme toggle (tokens exist; toggle deferred)
- Localization
- A `/changelog` or `/docs` route — README on GitHub is the docs source
- Pseudo-elements, transforms, animations, transitions, Shadow DOM, iframes (out of scope per the extension spec; do not introduce as test surfaces)

## Decisions log

| Decision | Choice | Rationale |
|---|---|---|
| Repo location | `web/` subdir in this repo | Token reuse stays trivial; extension and landing page evolve together; no monorepo refactor needed today |
| Distribution CTA | "Coming soon · Chrome Web Store" with one-line swap to real URL when published | CWS publishing isn't done; honesty + a deterministic future swap |
| Test surface scope | All eight stations (seven originally proposed + `important-wars`) | Every claimed extension feature gets a regression target; `!important` invariant was the highest-value addition |
| Page structure | Two routes — `/` (marketing) + `/lab` (stations) | Marketing pitch isn't compromised by test surfaces; `/lab` doesn't get hidden behind clicks; cleanest separation |
| Aesthetic | Full Precision Instrument across both routes | DESIGN.md is unambiguous; soft hero would undermine the product thesis |
| Implementation approach | Lightweight subdir, tokens copied by codegen, no pnpm workspaces | Smallest viable step; doesn't disturb the extension build; promotable later if a CLI or shared SDK shows up |
| Token reuse | `scripts/build-tokens.mjs` emits a 2nd output to `web/app/styles/tokens.css`; both verified by `pnpm tokens:check` | Single source of truth; CI catches drift |
| Marketing-route styling | CSS Modules + `var(--…)` tokens only; no Tailwind, no CSS-in-JS, no inline styles | Matches the panel; bans color drift via Biome rule |
| Tailwind isolation | `content` glob points only at `app/lab/tailwind/**`; compiled CSS imported only by that segment's layout | No utility-class bleed onto other routes |
| CSS-in-JS isolation | `styled-components` v6 + App Router SSR registry, scoped to `app/lab/css-in-js/` only | Same isolation principle |
| Theme | Dark only in v0; `<html data-theme="dark">` | Avoid first-paint flicker, stay on-brand |
| Fonts | Self-hosted JetBrains Mono + Inter Tight via `next/font/local` | No third-party CDN; LCP fast path |
| Icons | Hand-rolled inline SVGs only | Same rule as the extension panel |
| Voice | Precision Instrument register **plus dry sarcasm aimed at the industry / old workflow / project itself, never at the reader** | The extension's positioning is opinionated; the page should feel the same |

## Architecture

```
minnetonka/
├── src/                              # extension — UNCHANGED
├── scripts/
│   └── build-tokens.mjs              # CHANGED: emits 2nd copy → web/app/styles/tokens.css
├── web/                              # NEW — Next.js landing page
│   ├── package.json                  # next, react, typescript, biome
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts            # scoped: content → app/lab/tailwind/**/*.tsx
│   ├── postcss.config.js
│   ├── biome.json                    # extends ../biome.json
│   ├── CLAUDE.md                     # NEW — station→feature map, contract clause
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── og.png                    # static social card, committed to repo
│   │   └── fonts/                    # self-hosted variable WOFF2
│   └── app/
│       ├── layout.tsx                # tokens.css + globals.css + fonts; data-theme="dark"
│       ├── page.tsx                  # /  — marketing
│       ├── lab/
│       │   ├── page.tsx              # /lab — index of 8 stations
│       │   ├── plain/page.tsx
│       │   ├── tailwind/
│       │   │   ├── layout.tsx        # imports compiled tailwind.css
│       │   │   └── page.tsx
│       │   ├── modules/
│       │   │   ├── page.tsx
│       │   │   └── Modules.module.css
│       │   ├── css-in-js/
│       │   │   ├── layout.tsx
│       │   │   ├── registry.tsx     # styled-components SSR helper (~25 lines)
│       │   │   └── page.tsx
│       │   ├── inline/page.tsx
│       │   ├── deep-dom/page.tsx
│       │   ├── shared-grid/page.tsx
│       │   └── important-wars/
│       │       ├── page.tsx
│       │       └── important-wars.css
│       ├── styles/
│       │   ├── tokens.css            # AUTO-GENERATED from DESIGN.md
│       │   └── globals.css           # reset + selection + scrollbar + noise overlay
│       └── components/
│           ├── TopBar.tsx
│           ├── Hero.tsx
│           ├── FeatureRow.tsx
│           ├── PatchExample.tsx     # build-time Shiki highlighting
│           ├── InstallCTA.tsx
│           ├── InstallSection.tsx
│           ├── Footer.tsx
│           ├── StationFrame.tsx     # shared chrome for /lab/*
│           └── icons/               # hand-rolled SVGs
├── package.json                      # adds web:dev, web:build, web:typecheck, web:lint
├── pnpm-lock.yaml                    # one shared lockfile (still no workspaces)
├── vercel.json                       # NEW — pinned build/install/output dirs
├── .gitignore                        # adds web/.next, web/node_modules
├── CLAUDE.md                         # CHANGED: pointer to web/CLAUDE.md
└── .claude/repo-rules.md             # CHANGED: web/ permitted at root
```

### Token wiring

```
DESIGN.md frontmatter   ← single source of truth
        │
        │  pnpm tokens   (existing codegen, gets a 2nd output target)
        ▼
src/panel/styles/tokens.css        ← extension panel
web/app/styles/tokens.css          ← landing page (NEW)
```

`scripts/build-tokens.mjs` gets a `WEB_OUT` constant and writes the same content (same `AUTO-GENERATED` header) to both targets. `pnpm tokens:check` verifies both. CI fails on drift in either.

### Vercel deploy

- Vercel project's "Root Directory" set to `web/`.
- `vercel.json` at repo root pins:
  - Install command: `pnpm install`
  - Build command: `pnpm tokens && pnpm --dir web build`
  - Output directory: `web/.next`
- Production domain TBD by Kyle. Preview deploys per PR are the verification surface.

### Biome rule (no hex in marketing components)

`web/app/components/**/*.module.css` may not contain `#[0-9a-fA-F]{3,8}` color literals. Either a custom Biome rule, or a one-line grep check added to `pnpm tokens:check`. If a value isn't expressible via tokens, add the token to `DESIGN.md` first.

## Routes & components

### `/` — marketing route

Single scrollable column, max-width ~640px, centered. No sidebar, no nav. Footer links to `/lab` and GitHub.

Top-level components:

- `<TopBar />` — wordmark `// CSS WRANGLER` (mono, caps), `v0.1 · ALPHA` pill right-aligned. Hairline-bottom.
- `<Hero />` — eyebrow `PICK · TWEAK · SHIP`, two-line mono headline ("Edit any site's CSS / and hand the diff to **Claude**." — "Claude" colored `var(--accent-signal)`), Inter Tight body paragraph, dry secondary line, two CTAs.
- `<FeatureRow />` — three numbered cells `·01 PICK / ·02 PREVIEW / ·03 PATCH`. Hairline dividers. No icons.
- `<PatchExample />` — server-rendered code block. Real example imported from `src/shared/types.ts` so the page can never lie about the patch shape. Shiki-highlighted at build time, no client runtime.
- `<InstallCTA />` — "Coming soon · Chrome Web Store" disabled-button with hover tooltip; secondary "View on GitHub" link.
- `<InstallSection />` — three numbered command-line install steps for power users.
- `<Footer />` — hairline-top row, mono, build hash from `process.env.VERCEL_GIT_COMMIT_SHA`.

### `/lab` — index page

A directory page. Eight rows in a hairline-divided table linking to each station, plus an opener paragraph and a closing pointer to `web/CLAUDE.md`.

### `<StationFrame />` — shared chrome for every `/lab/*` page

- Top bar reads `STATION ·NN · NAME` left, `← /lab` right.
- A "WHAT THIS TESTS" card pinned to the top-right corner, three lines max, naming the extension files exercised.
- Bottom-of-page link back to `/lab`.

## The eight test stations

Each station's purpose, what it tests, and the WHAT-THIS-TESTS-box copy.

### `·01 /lab/plain` — Hand-written semantic CSS

- **DOM.** Hero, two cards, footer-style row. BEM-ish classes: `.hero`, `.card`, `.card--featured`, `.cta`.
- **Styling.** A single `plain.css` imported by the page only.
- **Tests.** Baseline picker + selector ranking. `styling-detect → "plain"`.
- **WHAT THIS TESTS.** "Baseline. Hand-written classes, no framework. The picker should pick a single readable selector. styling-detect → plain."

### `·02 /lab/tailwind` — Utility-class jumble

- **DOM.** Pricing-card grid, hero with utility wall, button with `hover:` and `focus-visible:` Tailwind classes.
- **Styling.** Tailwind v3 scoped to `app/lab/tailwind/**`. Compiled stylesheet imported only by `app/lab/tailwind/layout.tsx`.
- **Tests.** Tailwind detection branch in `styling-detect.ts`, the `tailwind-hint.ts` value→utility mapping, **and Tier 2 force-state preview against real Tailwind `:hover` / `:focus-visible` classes**.
- **WHAT THIS TESTS.** "Tailwind. Mass utility classes; the panel must show value→utility hints. Force-preview must work against real Tailwind hover/focus rules. styling-detect → tailwind."

### `·03 /lab/modules` — CSS Modules with mangled names

- **DOM.** Multiple components rendering with hashed classes (`Modules_heroTitle__a1b2c`).
- **Styling.** `Modules.module.css` co-located with the page.
- **Tests.** `extractCssModulesName` and `GENERATED_CLASS_PATTERNS` in `selectors.ts`. The denylist must extract the meaningful name, not reject the whole class. False positives are catastrophic; this station is the regression harness for the recent CSS-Modules detection bug fix.
- **WHAT THIS TESTS.** "CSS Modules. Mangled `Name_class__hash` → meaningful selector. The denylist must extract, not reject."

### `·04 /lab/css-in-js` — styled-components

- **DOM.** Several `styled.*` components rendering with auto-generated `sc-*` class names. One uses a `$variant` prop so the className changes per render.
- **Styling.** `styled-components` v6 + `app/lab/css-in-js/registry.tsx` SSR helper.
- **Tests.** `styling-detect → "css-in-js"`. Denylist must reject `sc-*` and runtime hash classes outright. Picker should fall back to a structural selector.
- **WHAT THIS TESTS.** "styled-components. Auto-generated `sc-*` classes are unreliable; the picker should not select on them."

### `·05 /lab/inline` — Inline styles, no classes

- **DOM.** Grid of `<div>` with `style="…"`, plus a small `<form>` (`<input>`, `<select>`, `<button>`) — no classes anywhere.
- **Styling.** None imported.
- **Tests.** Selector fallback path — picker must produce a `tag + nth-child` selector. Fallback behavior on non-`<div>` tags via the form.
- **WHAT THIS TESTS.** "No classes. The picker must build a structural selector. Form elements verify non-`<div>` fallback."

### `·06 /lab/deep-dom` — Nested + mutating + fixed

- **DOM.** 7-to-9 level nested tree. A `setInterval` ticker mutating `textContent` every 2s. A button that toggles a subtree's IDs and order. **A `position: fixed` header bar at the top of the page.**
- **Styling.** Plain.
- **Tests.** DOM-walker keyboard nav (up/down through ancestors). MutationObserver RAF throttling and `pagehide` cleanup. Picker outline positioning over `position: fixed` elements.
- **WHAT THIS TESTS.** "Deep DOM + live mutations + fixed-positioned header. The picker must walk ancestors. The observer must re-apply our class without thrashing. Outlines must position correctly over fixed elements."

### `·07 /lab/shared-grid` — Sibling-group bait

- **DOM.** Twelve `<article class="card">` items, identical inner structure.
- **Styling.** Plain CSS.
- **Tests.** Tier 2 similar-element detection. Editing one card should surface "11 similar elements found · apply to all?" — the patch's `siblingGroup` field should be populated.
- **WHAT THIS TESTS.** "Twelve siblings, one shared class. Edits should propose a sibling group; the patch should set `siblingGroup`, not `null`."

### `·08 /lab/important-wars` — Page-level `!important` battle

- **DOM.** Hero, button, paragraph, card. Every element has at least one property defined.
- **Styling.** A dedicated `important-wars.css` where every rule uses `!important` on color, padding, font-size, and background.
- **Tests.** Invariant #2 in `CLAUDE.md` — the extension must win the specificity battle via injected `!important` + unique `__wrangler-{id}` class. If a future change weakens the injector, this is where it shows up first.
- **WHAT THIS TESTS.** "Every rule on this page is `!important`. The extension's edits should still win. If they don't, invariant #2 is broken and so is the whole product. No pressure."

## Styling strategy summary

- **Marketing route (`/`)**: CSS Modules per component, consuming `var(--…)` tokens only. No Tailwind, no CSS-in-JS, no inline styles, no hex colors.
- **Lab stations**: each station uses the styling system it's testing. Tailwind, styled-components, and CSS Modules are isolated to their own subtrees and cannot leak to siblings.
- **Globals**: small reset, `::selection`, hairline scrollbar, the 2% noise overlay from `tokens.css.template` — copied or shared via the codegen.
- **Theme**: `data-theme="dark"` only. No toggle in v0.
- **Fonts**: `next/font/local` JetBrains Mono + Inter Tight, variable WOFF2, self-hosted.
- **Icons**: hand-rolled inline SVGs in `web/app/components/icons/`. Maximum four icons total in v0.

## Voice rules

- **Precision Instrument register.** Mono for selectors, values, code, file paths, version pills, install commands. Inter Tight for body prose only. Caps + tracking-caps for section labels and eyebrows. Title case for the headline. Sentence case for body.
- **Dry sarcasm, never insult.** The target of every joke is the industry, the old workflow, or the project itself — never the reader. Deadpan, world-weary, slightly amused at how things were before. If a line's only purpose is to be clever, cut it. Never punch at the user, never "edgy" for the sake of it, and never via emoji or exclamation points.
- **Banned words.** "Powerful", "seamless", "elegant", "delightful", "magic", "love", "built with [emoji]", "made different".
- **No emoji. No exclamation points. No corporate copy patterns.**
- **Section labels stay straight.** Sarcasm in `INSTALL` or `THE PATCH FORMAT` would be exhausting; reserved for body, tooltips, and the `/lab` description.

## Copy reference

### `/` — marketing route

**TopBar.** Wordmark `// CSS WRANGLER` left; pill `v0.1 · ALPHA` right.

**Hero.**

- Eyebrow: `PICK · TWEAK · SHIP`
- Headline (mono, accent-signal on "Claude"):
  > Edit any site's CSS  
  > and hand the diff to Claude.
- Body (Inter Tight, secondary):
  > A Chrome extension that turns visual CSS edits into a structured patch. Your AI agent applies it on the first try, which still feels like cheating.
- Secondary line (Inter Tight, tertiary):
  > The DevTools-edit-and-grep-and-pray loop, retired.

**InstallCTA.**

- Primary (disabled-looking, `cursor: default`):
  > ▸ COMING SOON · CHROME WEB STORE
- Primary tooltip on hover:
  > Pending Chrome Web Store review. Allegedly imminent. Build from source meanwhile.
- Secondary (linked, opens GitHub repo):
  > ▸ VIEW ON GITHUB

**FeatureRow.**

| | |
|---|---|
| `·01 PICK` | Pick any element. Keyboard-navigable DOM walker. Works on any page. The fancy ones too. |
| `·02 PREVIEW` | Live preview via injected style + unique class. Wins specificity wars without asking. |
| `·03 PATCH` | Markdown-fenced JSON on your clipboard. Versioned. Agent-ready. Boringly stable. |

**PatchExample.**

- Eyebrow: `THE PATCH FORMAT · v1.0`
- Code block: real example pulled from `src/shared/types.ts`.
- Closing lines:
  > Versioned at 1.0. We're optimistic. Pattern-matched downstream by Claude Code; the shape doesn't change without a major bump.

**InstallSection.**

- Eyebrow: `INSTALL · v0.1 ALPHA`
- Mono numbered list:
  ```
  ·01  pnpm install && pnpm build
  ·02  chrome://extensions → developer mode → load unpacked → pick dist/
  ·03  click the toolbar icon, side panel opens, click PICK ELEMENT
  ```
- Closing line:
  > When CSS Wrangler ships to the Chrome Web Store, this section becomes a single button. Until then, three steps. You'll live.

**Footer.**

- `// CSS WRANGLER · v0.1 · MIT · 2026 · github · /lab` left
- `· build a3f12c9` right (truncated commit SHA)
- Below, a deadpan single line:
  > No analytics. No telemetry. No newsletter. No Twitter.

### `/lab` — index page

```
THE LAB · CSS WRANGLER

This page exists to exercise every code path in the picker,
selector ranking, denylist, styling-detect, injector, and observer
across every styling system the extension supports. It also
doubles as the regression harness, because writing tests for a
Chrome extension is its own kind of misery.

Open the side panel. Pick anything. Copy a patch. If a station
behaves wrong, that station's source is your regression test.
You're welcome.
────────────────────────────────────────────────────────────────
·01  PLAIN CSS              hand-written semantic classes
·02  TAILWIND UTILITIES     mass utility-class detection + hints
·03  CSS MODULES            mangled `Name_class__hash` extraction
·04  CSS-IN-JS              styled-components `sc-*` denylist
·05  INLINE STYLES          structural-selector fallback
·06  DEEP DOM               walker + observer + position:fixed
·07  SHARED-CLASS GRID      sibling-group detection
·08  IMPORTANT WARS         page-level !important — extension wins
────────────────────────────────────────────────────────────────

If you change selectors.ts, injector.ts, or styling-detect.ts,
update or add a station. See web/CLAUDE.md. The contract is in
writing for a reason.
```

## Build sequence

`writing-plans` will turn this into stepwise tasks. The high-level phases:

### Phase 1 · Foundation

1. Create `web/` package + tsconfig + next.config + biome + gitignore additions.
2. Update `scripts/build-tokens.mjs` to emit a 2nd copy at `web/app/styles/tokens.css`. Update `pnpm tokens:check` to verify both.
3. Add root-package proxy scripts: `web:dev`, `web:build`, `web:typecheck`, `web:lint`.
4. Update `.claude/repo-rules.md` to allow `web/` at root; add a pointer in root `CLAUDE.md` to `web/CLAUDE.md`.
5. Stub `web/CLAUDE.md` with the station→feature mapping and the contract clause.
6. Set up `next/font/local` with JetBrains Mono + Inter Tight (variable WOFF2 in `web/public/fonts/`).
7. Skeleton `web/app/layout.tsx`, `web/app/page.tsx`, `web/app/lab/page.tsx`.
8. **Verify.** `pnpm web:dev` boots; `/` and `/lab` placeholders render in the correct fonts on dark; `pnpm web:typecheck`, `pnpm tokens:check` clean.

### Phase 2 · Marketing route — INVOKES `frontend-design`

9. Hand the marketing-route brief to **`frontend-design`** as a single self-contained prompt:
   - The "Routes & components" section of this spec
   - The "Styling strategy summary" section
   - The "Copy reference" section
   - The relevant fragment of `DESIGN.md`
   - The hard "no" list (no shadcn / Radix, no hex colors, no Tailwind, no CSS-in-JS, no emoji, no exclamation points)
   - The "Voice rules" section, dry-sarcasm rule included
   - The specific file paths to create under `web/app/components/` and `web/app/page.tsx`
10. Wire `<PatchExample />` to import the actual `Patch` type from `src/shared/types.ts` and render a real example. Highlight at build time via Shiki.
11. **Verify.** `/` loads with all Section-5 copy present; no console errors; Lighthouse mobile ≥ 95 across all four scores; no third-party domains in network tab.

### Phase 3 · Lab index + simple stations 01, 05, 08 — INVOKES `frontend-design`

12. `/lab` index page with the table linking to each station.
13. `<StationFrame />` shared component.
14. Station 01 (plain) — establishes the per-station shape.
15. Station 05 (inline) — small, includes the `<form>` extension.
16. Station 08 (important-wars) — short, every rule `!important`.
17. **Verify.** With the extension installed in Chrome (manual), pick + edit + copy patch on each station; confirm `stylingSystem` is correct; for station 08 confirm edits visibly override the page CSS.

### Phase 4 · Framework-heavy stations 02, 03, 04, 06, 07 — INVOKES `frontend-design` once for the batch

`frontend-design` receives one brief covering all five stations together, since they share the `<StationFrame />` shell and only differ in inner content. The brief explicitly enumerates each station's DOM, styling system, and what-this-tests box copy, plus the same hard "no" list as Phase 2.

18. Station 02 (tailwind): add Tailwind v3 scoped to `app/lab/tailwind/**`; pricing-card grid + button with `:hover` / `:focus-visible`.
19. Station 03 (modules): `Modules.module.css` rendering hashed class names.
20. Station 04 (css-in-js): `styled-components` v6 + SSR registry; 3–4 styled components incl. one with a `$variant` prop.
21. Station 06 (deep-dom): nested tree + ticker + subtree-toggle button + fixed header bar.
22. Station 07 (shared-grid): 12 article cards, identical class.
23. **Verify per station.** Chrome-only; document any unexpected extension behavior in `web/CLAUDE.md` rather than fixing in the station — the station's job is to fail authentically.

### Phase 5 · Vercel deploy

24. `vercel link` from `web/`. Project root → `/web`.
25. Add `vercel.json` at repo root pinning install/build/output commands.
26. Trigger preview deploy from a PR; confirm token codegen runs, fonts self-host, patch JSON renders.
27. Promote to production once preview looks right.
28. **Verify.** Production URL serves both routes; Lighthouse mobile ≥ 95; no third-party connections; CWS button shows tooltip and is unclickable; GitHub link works.

## Verification gates (definition of done)

A change to `web/` is not done until all of these pass:

```bash
pnpm typecheck            # extension still typechecks
pnpm web:typecheck        # web typechecks
pnpm lint                 # extension biome clean
pnpm web:lint             # web biome clean
pnpm tokens:check         # both token outputs match DESIGN.md
pnpm build                # extension builds clean
pnpm web:build            # next builds clean
```

Plus manual end-to-end (per `CLAUDE.md`):

- Load `dist/` unpacked. Open the deployed URL (or `pnpm web:dev`).
- Walk every station; confirm the WHAT THIS TESTS claim.
- Confirm no third-party domains in network tab.
- Confirm mobile viewport renders without horizontal scroll.

If a runtime check requires Chrome (every station check fundamentally does), the implementer says so and hands off rather than claiming success.

## When `frontend-design` is invoked

Three times in the implementation:

- **Phase 2** — marketing route (`/` + all components in `web/app/components/`).
- **Phase 3** — lab index + the three simple stations (01 plain, 05 inline, 08 important-wars) + the shared `<StationFrame />`.
- **Phase 4** — the five framework-heavy stations (02 tailwind, 03 modules, 04 css-in-js, 06 deep-dom, 07 shared-grid), batched into one brief because they share the frame and only differ in inner content.

Each invocation receives a self-contained brief that includes:

- Relevant sections of this design spec
- The relevant fragment of `DESIGN.md`
- The hard "no" list (no shadcn, no hex, no Tailwind in marketing, no emoji, no exclamation points, voice rules including dry-sarcasm)
- The specific file paths to create

The implementation plan from `writing-plans` will record these three delegations explicitly so neither the implementer nor a future session forgets.

## Out-of-scope reminders

These are explicitly NOT being added in v0:

- Newsletter / email capture
- Analytics or telemetry
- Light theme toggle
- Localization
- A `/changelog` or `/docs` route — README on GitHub is the docs source
- Any third-party fonts, icons, or scripts
- Pseudo-elements, transforms, animations, transitions, Shadow DOM, iframes (out of scope per the extension spec; do not add as test surfaces)
- Lighthouse fluff — preconnects, etc. — none used because no third parties
