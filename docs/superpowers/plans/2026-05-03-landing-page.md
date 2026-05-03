# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Vercel-deployed Next.js landing page at `web/` for the CSS Wrangler Chrome extension. The marketing route (`/`) sells the tool. The `/lab` route hosts eight test stations engineered to exercise the picker, selector ranking, denylist, `styling-detect`, injector, observer, and sibling-group code paths — doubling as a manual regression bench.

**Architecture:** Lightweight subdir `web/` in the existing repo (no pnpm workspaces). Tokens flow from `DESIGN.md` frontmatter into both the panel and the landing page via the existing `build-tokens.mjs` codegen, extended with a second output target. Tailwind v3 is scoped to `app/lab/tailwind/**` only; styled-components v6 is scoped to `app/lab/css-in-js/**` only. Marketing route uses CSS Modules + `var(--…)` tokens. Three `frontend-design` invocations (Phases 2, 3, 4) generate the actual UI components against bespoke briefs; this plan does not write that UI by hand.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Biome, CSS Modules + tokens, Tailwind v3 (scoped), styled-components v6 (scoped), Shiki + `hast-util-to-jsx-runtime` for build-time syntax highlighting, `next/font/local` self-hosted JetBrains Mono Variable + Inter Tight Variable, Vercel.

**Spec source:** `docs/superpowers/specs/2026-05-03-landing-page-design.md`. This plan implements that spec.

**Verification model:** This project has no automated test framework (the extension's `CLAUDE.md` lists "automated tests" as out of scope for v0). Verification is `pnpm typecheck` + `pnpm lint` + `pnpm tokens:check` + `pnpm build` clean, plus manual eyeball checks. Where steps below say "verify," that's the standard.

---

## Phase 1 · Foundation

### Task 1: Bootstrap the `web/` Next.js package

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.ts`
- Create: `web/biome.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "css-wrangler-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "biome check ."
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "shiki": "^1.24.0",
    "hast-util-to-jsx-runtime": "^2.3.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.2"
  }
}
```

- [ ] **Step 2: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@shared/*": ["../src/shared/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

> The `@shared/*` alias lets the patch-example data file import the real `Patch` type from `src/shared/types.ts` without copying.

- [ ] **Step 3: Create `web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  outputFileTracingRoot: "../",
};

export default nextConfig;
```

- [ ] **Step 4: Create `web/biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "extends": ["../biome.json"],
  "files": {
    "ignore": [".next", "node_modules", "next-env.d.ts"]
  }
}
```

- [ ] **Step 5: Update root `.gitignore` to exclude `web/.next` and `web/node_modules`**

Append the following lines to the existing `.gitignore`:

```
web/.next
web/node_modules
web/next-env.d.ts
```

- [ ] **Step 6: Install web dependencies**

Run:
```bash
cd web && pnpm install && cd ..
```

Expected: pnpm creates `web/node_modules` and `web/pnpm-lock.yaml`. The root `pnpm-lock.yaml` stays untouched (no workspaces).

- [ ] **Step 7: Verify the package boots**

Run:
```bash
cd web && pnpm typecheck && cd ..
```

Expected: exits 0, prints nothing (no source files yet).

- [ ] **Step 8: Commit**

```bash
git add web/package.json web/tsconfig.json web/next.config.ts web/biome.json web/pnpm-lock.yaml .gitignore
git commit -m "feat(web): bootstrap Next.js package at web/"
```

---

### Task 2: Extend `build-tokens.mjs` to emit a second output

**Files:**
- Modify: `scripts/build-tokens.mjs`
- Create: `web/app/styles/tokens.css` (auto-generated; commit the generated file)

- [ ] **Step 1: Update `scripts/build-tokens.mjs` to emit two outputs**

Replace lines 32–35 of `scripts/build-tokens.mjs`:

```js
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DESIGN_MD = join(ROOT, "DESIGN.md");
const TEMPLATE = join(__dirname, "tokens.css.template");
const OUTPUTS = [
  join(ROOT, "src/panel/styles/tokens.css"),
  join(ROOT, "web/app/styles/tokens.css"),
];
```

- [ ] **Step 2: Update the write/check logic to iterate over `OUTPUTS`**

Replace lines 105–127 (the bottom of the file) with:

```js
const check = process.argv.includes("--check");
const next = build();

if (check) {
  let drift = false;
  for (const out of OUTPUTS) {
    let current = "";
    try {
      current = readFileSync(out, "utf8");
    } catch {
      /* missing — treat as drift */
    }
    if (current !== next) {
      const path = relative(ROOT, out);
      console.error(`✗ ${path} is out of sync with DESIGN.md`);
      drift = true;
    }
  }
  if (drift) {
    console.error("  Run `pnpm tokens` and commit the regenerated files.");
    process.exit(1);
  }
  console.log("✓ tokens.css in sync with DESIGN.md (both outputs)");
  process.exit(0);
}

for (const out of OUTPUTS) {
  writeFileSync(out, next);
  console.log(`✓ wrote ${relative(ROOT, out)}`);
}
```

- [ ] **Step 3: Create the target directory and run the codegen**

```bash
mkdir -p web/app/styles
pnpm tokens
```

Expected: prints `✓ wrote src/panel/styles/tokens.css` and `✓ wrote web/app/styles/tokens.css`. The two files are byte-identical.

- [ ] **Step 4: Verify with `pnpm tokens:check`**

Run:
```bash
pnpm tokens:check
```

Expected: prints `✓ tokens.css in sync with DESIGN.md (both outputs)`. Exits 0.

- [ ] **Step 5: Confirm the panel still has correct tokens**

Run:
```bash
diff src/panel/styles/tokens.css web/app/styles/tokens.css
```

Expected: no output (files identical).

- [ ] **Step 6: Commit**

```bash
git add scripts/build-tokens.mjs web/app/styles/tokens.css
git commit -m "feat(tokens): emit second output to web/app/styles/tokens.css"
```

---

### Task 3: Add root-package proxy scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `web:*` proxy scripts to root `package.json`**

In the root `package.json` `"scripts"` block (currently lines 8–18), append after `"design:diff"`:

```json
    "web:dev": "pnpm --dir web dev",
    "web:build": "pnpm tokens && pnpm --dir web build",
    "web:typecheck": "pnpm --dir web typecheck",
    "web:lint": "pnpm --dir web lint",
    "web:install": "pnpm --dir web install"
```

The complete `"scripts"` block now reads:

```json
  "scripts": {
    "dev": "pnpm tokens && vite",
    "build": "pnpm tokens && tsc -b && vite build",
    "preview": "vite preview",
    "lint": "biome check src",
    "format": "biome format --write src",
    "typecheck": "tsc -b --noEmit",
    "tokens": "node scripts/build-tokens.mjs",
    "tokens:check": "node scripts/build-tokens.mjs --check",
    "design:lint": "design.md lint DESIGN.md",
    "design:diff": "design.md diff",
    "web:dev": "pnpm --dir web dev",
    "web:build": "pnpm tokens && pnpm --dir web build",
    "web:typecheck": "pnpm --dir web typecheck",
    "web:lint": "pnpm --dir web lint",
    "web:install": "pnpm --dir web install"
  },
```

- [ ] **Step 2: Verify the proxy scripts run**

Run:
```bash
pnpm web:typecheck
```

Expected: exits 0, no output.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(web): add root proxy scripts (web:dev, web:build, web:typecheck, web:lint)"
```

---

### Task 4: Update repo conventions

**Files:**
- Modify: `.claude/repo-rules.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `web/` to the allowed top-level directories**

In `.claude/repo-rules.md`, find the "Directory purposes" section and append a bullet:

```markdown
- `web/` — Next.js landing page (Vercel-hosted). Marketing route + `/lab`
  test-station bench. See `web/CLAUDE.md` for landing-page conventions.
  Independent `node_modules` and `pnpm-lock.yaml` (no workspaces).
```

- [ ] **Step 2: Add a pointer in the root `CLAUDE.md`**

In `CLAUDE.md`, find the "Repo layout" section's tree-style code block. After the existing top-level entries (after `dist/` description) and before the closing backticks, add:

```
└── web/                               # Next.js landing page (separate package)
                                       # See web/CLAUDE.md for conventions
```

Then in the "When in doubt" section at the end, add a final bullet:

```markdown
- Landing-page conventions and the test-station→feature contract → `web/CLAUDE.md`
```

- [ ] **Step 3: Commit**

```bash
git add .claude/repo-rules.md CLAUDE.md
git commit -m "docs: register web/ in repo-rules and root CLAUDE.md"
```

---

### Task 5: Author `web/CLAUDE.md` (the contract clause)

**Files:**
- Create: `web/CLAUDE.md`

- [ ] **Step 1: Create `web/CLAUDE.md`**

```markdown
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
   literals allowed.** Verified by a grep step in `pnpm tokens:check`. If
   you can't express a value with a token, add the token to `DESIGN.md`
   first.
2. **Tailwind is scoped strictly to `app/lab/tailwind/**`.** `tailwind.config.ts`'s
   `content` glob points only there; the compiled stylesheet is imported
   only by `app/lab/tailwind/layout.tsx`. Utility classes used elsewhere
   will not render — by design.
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
```

- [ ] **Step 2: Commit**

```bash
git add web/CLAUDE.md
git commit -m "docs(web): write web/CLAUDE.md with the station contract"
```

---

### Task 6: Self-host the two fonts

**Files:**
- Create: `web/public/fonts/JetBrainsMono-Variable.woff2` (binary, downloaded)
- Create: `web/public/fonts/InterTight-Variable.woff2` (binary, downloaded)
- Create: `web/app/fonts.ts`

> JetBrains Mono Variable and Inter Tight Variable are both available as
> Latin-subset variable WOFF2 files via `@fontsource-variable/*` packages.
> Easiest reproducible path: install the packages in `web/`, copy the
> variable WOFF2 files into `web/public/fonts/`, commit them.

- [ ] **Step 1: Install fontsource packages temporarily to extract the WOFF2 files**

```bash
cd web && pnpm add -D @fontsource-variable/jetbrains-mono @fontsource-variable/inter-tight && cd ..
```

- [ ] **Step 2: Copy the variable WOFF2 files into `web/public/fonts/`**

```bash
mkdir -p web/public/fonts
cp web/node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2 \
   web/public/fonts/JetBrainsMono-Variable.woff2
cp web/node_modules/@fontsource-variable/inter-tight/files/inter-tight-latin-wght-normal.woff2 \
   web/public/fonts/InterTight-Variable.woff2
```

Expected: both files exist in `web/public/fonts/`. Confirm with `ls -la web/public/fonts/`.

- [ ] **Step 3: Remove the fontsource dev-dependencies (we only needed the files)**

```bash
cd web && pnpm remove @fontsource-variable/jetbrains-mono @fontsource-variable/inter-tight && cd ..
```

> Rationale: the WOFF2 files are now committed; we don't need the npm
> packages going forward, and removing them keeps `web/`'s dependency tree
> minimal. If the fonts are ever updated, repeat steps 1–3.

- [ ] **Step 4: Create `web/app/fonts.ts`**

```ts
import localFont from "next/font/local";

export const fontMono = localFont({
  src: "../public/fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "400 700",
});

export const fontUI = localFont({
  src: "../public/fonts/InterTight-Variable.woff2",
  variable: "--font-ui",
  display: "swap",
  weight: "400 700",
});
```

- [ ] **Step 5: Commit**

```bash
git add web/public/fonts/JetBrainsMono-Variable.woff2 \
        web/public/fonts/InterTight-Variable.woff2 \
        web/app/fonts.ts \
        web/package.json web/pnpm-lock.yaml
git commit -m "feat(web): self-host JetBrains Mono + Inter Tight variable fonts"
```

---

### Task 7: Skeleton routes and globals

**Files:**
- Create: `web/app/styles/globals.css`
- Create: `web/app/layout.tsx`
- Create: `web/app/page.tsx`
- Create: `web/app/lab/page.tsx`

- [ ] **Step 1: Create `web/app/styles/globals.css`**

```css
/*
 * globals.css — base reset + selection + scrollbar + noise overlay.
 * Tokens come from tokens.css (auto-generated from DESIGN.md).
 */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

html {
  background: var(--bg-page);
  color: var(--fg-primary);
  font-family: var(--font-ui);
  font-size: var(--type-body);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
}

body {
  min-height: 100vh;
  background-image: var(--noise-svg);
}

::selection {
  background: var(--accent-signal);
  color: var(--bg-page);
}

/* Hairline scrollbars */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}
*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
*::-webkit-scrollbar-thumb {
  background: var(--border-strong);
}
*::-webkit-scrollbar-track {
  background: transparent;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}

code,
pre {
  font-family: var(--font-mono);
}
```

- [ ] **Step 2: Create `web/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { fontMono, fontUI } from "./fonts";
import "./styles/tokens.css";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: "CSS Wrangler — pick · tweak · ship",
  description:
    "A Chrome extension that turns visual CSS edits into a structured patch. Your AI agent applies it on the first try.",
  metadataBase: new URL("https://css-wrangler.vercel.app"),
  openGraph: {
    title: "CSS Wrangler",
    description:
      "Edit any site's CSS and hand the diff to Claude.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${fontMono.variable} ${fontUI.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create a placeholder `web/app/page.tsx`**

```tsx
export default function HomePage() {
  return (
    <main style={{ padding: "var(--sp-9)", fontFamily: "var(--font-mono)" }}>
      <p style={{ fontSize: "var(--type-display)", letterSpacing: "var(--tracking-caps)" }}>
        // CSS WRANGLER · placeholder
      </p>
      <p style={{ color: "var(--fg-tertiary)", marginTop: "var(--sp-4)" }}>
        Marketing route — built in Phase 2 by frontend-design.
      </p>
    </main>
  );
}
```

> Inline `style=` here is a one-time bootstrap exception. Phase 2 replaces
> this entire file with a frontend-design output that uses CSS Modules.

- [ ] **Step 4: Create a placeholder `web/app/lab/page.tsx`**

```tsx
export default function LabPage() {
  return (
    <main style={{ padding: "var(--sp-9)", fontFamily: "var(--font-mono)" }}>
      <p style={{ fontSize: "var(--type-display)", letterSpacing: "var(--tracking-caps)" }}>
        THE LAB · placeholder
      </p>
      <p style={{ color: "var(--fg-tertiary)", marginTop: "var(--sp-4)" }}>
        Eight stations — built in Phases 3–4 by frontend-design.
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Verify dev server boots**

Run:
```bash
pnpm web:dev
```

Expected: Next.js prints `✓ Ready in …ms` and `Local: http://localhost:3000`. Open http://localhost:3000 in a browser; you see the dark page with `// CSS WRANGLER · placeholder` in JetBrains Mono. Open http://localhost:3000/lab; you see the lab placeholder. Stop the server with Ctrl-C.

- [ ] **Step 6: Verify typecheck and build**

```bash
pnpm web:typecheck
pnpm web:build
```

Expected: both exit 0. `pnpm web:build` prints a route table showing `/` (static) and `/lab` (static).

- [ ] **Step 7: Commit**

```bash
git add web/app/styles/globals.css web/app/layout.tsx web/app/page.tsx web/app/lab/page.tsx
git commit -m "feat(web): skeleton routes and globals.css"
```

---

### Task 8: Phase 1 verification gate

- [ ] **Step 1: Run the full Phase 1 verification checklist**

```bash
pnpm typecheck         # extension still typechecks
pnpm web:typecheck     # web typechecks
pnpm lint              # extension biome clean
pnpm web:lint          # web biome clean
pnpm tokens:check      # both token outputs match DESIGN.md
pnpm build             # extension builds clean
pnpm web:build         # next builds clean
```

Each command must exit 0. If any fails, fix the issue before continuing.

- [ ] **Step 2: Confirm the dev experience manually**

```bash
pnpm web:dev
```

Visit http://localhost:3000 and http://localhost:3000/lab. Both render in JetBrains Mono on a dark background. No console errors. Stop the server.

- [ ] **Step 3: Commit any cleanup if needed**

If steps 1–2 surfaced a fix, commit it with a clear message. Otherwise no commit.

---

## Phase 2 · Marketing route — invokes `frontend-design`

### Task 9: Author the marketing-route brief

**Files:**
- Create: `docs/superpowers/briefs/2026-05-03-frontend-design-marketing.md`

> The brief is committed alongside the plan so future sessions can see what
> was handed to the implementation skill.

- [ ] **Step 1: Create the brief**

Write the file with the full brief content. Structure:

````markdown
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
- Three steps in a `<ol>` rendered as a mono list (kill default decimals; render `·NN` as the marker).
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
````

- [ ] **Step 2: Commit the brief**

```bash
mkdir -p docs/superpowers/briefs
git add docs/superpowers/briefs/2026-05-03-frontend-design-marketing.md
git commit -m "docs: brief for frontend-design — marketing route (Phase 2)"
```

---

### Task 10: Invoke `frontend-design` for the marketing route

- [ ] **Step 1: Invoke `frontend-design` with the brief**

Use the `Skill` tool with `frontend-design:frontend-design` and pass the contents of `docs/superpowers/briefs/2026-05-03-frontend-design-marketing.md` as the prompt argument. The brief is fully self-contained — no additional context needed.

- [ ] **Step 2: Review the output**

Confirm the agent created exactly the files listed in the brief's "Files to create" section. Read `web/app/page.tsx` and each component file.

Reject and re-prompt if you find any of:
- Tailwind utility classes
- CSS-in-JS / styled-components
- Hex color literals (verify with `grep -rE "#[0-9a-fA-F]{3,8}" web/app/components`)
- Emoji or exclamation points in user-facing copy
- Imports from icon libraries (lucide, react-icons, etc.)
- Components not in the file list (scope creep)
- Copy that deviates from the brief

- [ ] **Step 3: Run the verification gate**

```bash
pnpm web:typecheck
pnpm web:lint
pnpm web:build
```

All three must exit 0.

- [ ] **Step 4: Manual verify**

```bash
pnpm web:dev
```

Visit http://localhost:3000. Confirm:
- Hero renders correctly; "Claude" is orange (`accent-signal`).
- All copy is verbatim from the brief.
- No console errors.
- No third-party network requests in DevTools Network tab (filter on `Domain != localhost`).
- Hover the disabled "COMING SOON" button — tooltip appears.
- The GitHub link opens in a new tab.

- [ ] **Step 5: Commit the agent's output**

```bash
git add web/app/page.tsx web/app/components/
git commit -m "feat(web): marketing route components (frontend-design output)"
```

---

### Task 11: Wire `<PatchExample />` to the real `Patch` type with Shiki

**Files:**
- Modify: `web/app/components/PatchExample.tsx`
- Create: `web/app/components/patch-example-data.ts`

> The placeholder JSON gets replaced with a real example imported from
> `src/shared/types.ts` so the page can never lie about the patch shape.
> Shiki performs build-time syntax highlighting; the highlighted output
> is rendered through `hast-util-to-jsx-runtime` so we get real React
> elements (no raw HTML injection).

- [ ] **Step 1: Verify Shiki + hast renderer are installed**

Both `shiki` and `hast-util-to-jsx-runtime` were added in Task 1's `web/package.json`. Confirm with:

```bash
cd web && pnpm list shiki hast-util-to-jsx-runtime && cd ..
```

Expected: prints versions for both. If missing, `cd web && pnpm add shiki hast-util-to-jsx-runtime && cd ..`.

- [ ] **Step 2: Create a typed example builder**

Create `web/app/components/patch-example-data.ts`:

```ts
import type { Patch } from "@shared/types";

export const examplePatch: Patch = {
  version: "1.0",
  source: "css-wrangler",
  url: "https://example.com",
  capturedAt: "2026-05-03T17:42:11.000Z",
  stylingSystem: "tailwind",
  breakpoints: { mobile: 640, tablet: 768, desktop: 1024 },
  edits: [
    {
      siblingGroup: null,
      element: {
        tag: "button",
        text: "Get started",
        role: "button",
        ariaLabel: null,
        selectors: [
          { type: "class", value: ".hero-cta", stability: "high" },
        ],
        domPath: "main > section.hero > button.hero-cta",
      },
      changes: [
        { property: "padding", from: "12px 24px", to: "16px 32px" },
      ],
    },
  ],
};
```

> If TypeScript complains about a property mismatch with the `Patch` type
> from `src/shared/types.ts`, that's the page lying about the patch
> shape — fix the example, don't loosen the type. (This is the entire
> point of importing from `@shared/types`.)

- [ ] **Step 3: Update `PatchExample.tsx` to use Shiki + AST renderer**

Replace the existing `PatchExample` implementation with:

```tsx
import { codeToHast } from "shiki";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, type ReactNode } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { examplePatch } from "./patch-example-data";
import styles from "./PatchExample.module.css";

async function highlight(code: string): Promise<ReactNode> {
  const tree = await codeToHast(code, {
    lang: "json",
    theme: "vesper",
  });
  return toJsxRuntime(tree, { Fragment, jsx, jsxs });
}

export async function PatchExample() {
  const json = JSON.stringify(examplePatch, null, 2);
  const highlighted = await highlight(json);

  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>THE PATCH FORMAT · v1.0</p>
      <div className={styles.code}>{highlighted}</div>
      <p className={styles.trailing}>
        Versioned at 1.0. We're optimistic. Pattern-matched downstream by
        Claude Code; the shape doesn't change without a major bump.
      </p>
    </section>
  );
}
```

> The `toJsxRuntime` call returns real React elements (no `dangerouslySetInnerHTML`).
> Highlighting happens at build time because the component is a server
> component and the input is constant — Next.js bakes the result into the
> static HTML.

- [ ] **Step 4: Tweak `PatchExample.module.css` so Shiki's output sits inside the existing card**

Shiki emits `<pre class="shiki vesper" style="background-color:…"><code>…</code></pre>`. Override the inline background with a child selector so the card's `var(--bg-elev-1)` shows:

```css
.code :global(pre.shiki) {
  background: transparent !important;
  margin: 0;
  font-size: var(--type-data);
  line-height: var(--leading-tight);
  overflow-x: auto;
}

.code :global(pre.shiki code) {
  font-family: var(--font-mono);
}
```

- [ ] **Step 5: Verify the build**

```bash
pnpm web:typecheck
pnpm web:build
pnpm web:dev
```

Visit http://localhost:3000. Confirm the patch JSON renders with syntax colors. Confirm no client-side Shiki bundle: open DevTools → Sources → search for "shiki" — there should be no matching JS chunks loaded by the page (Shiki is server-side only). Stop the dev server.

- [ ] **Step 6: Confirm the path alias works**

If `pnpm web:typecheck` failed because `@shared/types` couldn't resolve, double-check the `paths` block in `web/tsconfig.json` (Task 1 Step 2). The `@shared/*` alias points at `../src/shared/*`.

- [ ] **Step 7: Commit**

```bash
git add web/app/components/PatchExample.tsx \
        web/app/components/PatchExample.module.css \
        web/app/components/patch-example-data.ts
git commit -m "feat(web): wire PatchExample to real Patch type with Shiki"
```

---

### Task 12: Phase 2 verification gate

- [ ] **Step 1: Run the full verification sequence**

```bash
pnpm typecheck
pnpm web:typecheck
pnpm lint
pnpm web:lint
pnpm tokens:check
pnpm build
pnpm web:build
```

All exit 0.

- [ ] **Step 2: Verify no hex literals in marketing components**

```bash
grep -rE "#[0-9a-fA-F]{3,8}" web/app/components/ web/app/page.tsx web/app/styles/globals.css
```

Expected: no output. If grep finds hex literals, replace them with token vars before continuing.

- [ ] **Step 3: Lighthouse mobile audit**

Open http://localhost:3000 in Chrome with the extension installed. Run Lighthouse → Mobile → Performance + Accessibility + Best Practices + SEO. Each must be ≥ 95. If under, identify the cause (most likely image weight or font loading) and fix before continuing.

- [ ] **Step 4: No-third-party check**

DevTools → Network → reload page. Sort by Domain. Every entry should be `localhost`. If any third-party domain appears, identify the source (most likely an icon library that snuck in) and remove it.

- [ ] **Step 5: Commit any cleanup**

If steps 1–4 surfaced fixes, commit them with a clear message. Otherwise no commit.

---

## Phase 3 · Lab index + simple stations — invokes `frontend-design`

### Task 13: Author the Phase 3 brief

**Files:**
- Create: `docs/superpowers/briefs/2026-05-03-frontend-design-lab-simple.md`

- [ ] **Step 1: Create the brief**

The brief covers `web/app/lab/page.tsx` (the index), `web/app/components/StationFrame.tsx`, and the three simple stations (`/lab/plain`, `/lab/inline`, `/lab/important-wars`).

The brief MUST include the same "Hard rules" and "Voice rules" sections as the marketing brief (Task 9), plus:

**Files to create:**
- `web/app/components/StationFrame.tsx` (+ `StationFrame.module.css`) — shared chrome with a top bar `STATION ·NN · NAME` left, `← /lab` right, and a "WHAT THIS TESTS" card pinned to the top-right corner with three-line max copy. Component prop signature:
  ```tsx
  type Props = {
    stationNumber: string;     // "01", "02", ...
    stationName: string;       // "PLAIN CSS", "TAILWIND UTILITIES", ...
    testsBox: string;          // up to 3 lines, displayed in the top-right card
    children: React.ReactNode; // station body
  };
  ```
- `web/app/lab/page.tsx` (+ `lab-index.module.css`) — the `/lab` index page. Renders the eight rows from the spec exactly. Use the literal monospace ASCII layout from the spec. Each row links to its station path.
- `web/app/lab/plain/page.tsx` (+ `plain.css`) — Station 01. DOM: hero, two cards (one `.card--featured`), footer-style row. BEM-ish classes only. Page wraps body in `<StationFrame stationNumber="01" stationName="PLAIN CSS" testsBox="...">`.
- `web/app/lab/inline/page.tsx` — Station 05. DOM: grid of `<div>` with inline `style=`, plus a `<form>` (input, select, button) with no classes. Wraps body in `<StationFrame stationNumber="05" ...>`.
- `web/app/lab/important-wars/page.tsx` (+ `important-wars.css`) — Station 08. CSS file uses `!important` on color, padding, font-size, and background for every selector. Wraps body in `<StationFrame stationNumber="08" ...>`.

**Per-station WHAT THIS TESTS box copy** — verbatim from the spec:
- 01: "Baseline. Hand-written classes, no framework. The picker should pick a single readable selector. styling-detect → plain."
- 05: "No classes. The picker must build a structural selector. Form elements verify non-`<div>` fallback."
- 08: "Every rule on this page is `!important`. The extension's edits should still win. If they don't, invariant #2 is broken and so is the whole product. No pressure."

**`/lab` index copy:** verbatim from the spec's "Copy reference → /lab — index page" block. Render the ASCII rows in `var(--font-mono)` with `var(--leading-tight)`. The rows hyperlink to each station path. Stations 02, 03, 04, 06, 07 link to paths that don't exist yet (Phase 4 builds those) — that's expected.

**Definition of done:** `pnpm web:typecheck`, `pnpm web:lint`, `pnpm web:build` clean; `/lab` and the three station routes load and link correctly; each station's `<StationFrame />` shows the right `STATION ·NN · NAME` and the right WHAT-THIS-TESTS box copy; no third-party requests; no hex literals in `web/app/components/StationFrame.module.css` or `web/app/lab/lab-index.module.css`.

- [ ] **Step 2: Commit the brief**

```bash
git add docs/superpowers/briefs/2026-05-03-frontend-design-lab-simple.md
git commit -m "docs: brief for frontend-design — lab index + simple stations (Phase 3)"
```

---

### Task 14: Invoke `frontend-design` for Phase 3

- [ ] **Step 1: Invoke `frontend-design`**

Use the `Skill` tool with `frontend-design:frontend-design` and pass the contents of `docs/superpowers/briefs/2026-05-03-frontend-design-lab-simple.md`.

- [ ] **Step 2: Review the output**

Confirm exactly the files in the brief were created. Reject and re-prompt if:
- The `/lab` index uses something other than the literal ASCII layout from the spec.
- A station file is missing or contains content beyond what the brief specified.
- `<StationFrame />` doesn't pin the WHAT THIS TESTS box to the top-right.
- Station 08's CSS lacks `!important` on the listed properties — the entire point of the station is invalidated.

- [ ] **Step 3: Run the verification gate**

```bash
pnpm web:typecheck
pnpm web:lint
pnpm web:build
```

All exit 0.

- [ ] **Step 4: Manual route check**

```bash
pnpm web:dev
```

Visit:
- http://localhost:3000/lab — index renders, all eight rows visible, each links to its station path. (Stations 02, 03, 04, 06, 07 will 404 — expected, they're built in Phase 4.)
- http://localhost:3000/lab/plain
- http://localhost:3000/lab/inline
- http://localhost:3000/lab/important-wars

For each: WHAT THIS TESTS card shows the exact copy from the brief. `STATION ·NN · NAME` matches.

- [ ] **Step 5: Commit**

```bash
git add web/app/lab/ web/app/components/StationFrame.tsx web/app/components/StationFrame.module.css
git commit -m "feat(web): lab index + stations 01, 05, 08 (frontend-design output)"
```

---

### Task 15: Phase 3 verification gate (with extension)

> This step requires Chrome and the extension's `dist/` loaded unpacked.
> An automated agent without Chrome access cannot complete this step and
> must hand off to a human, per the spec's verification model.

- [ ] **Step 1: Build the extension**

```bash
pnpm build
```

Expected: `dist/` is up-to-date.

- [ ] **Step 2: Load the extension**

In Chrome: `chrome://extensions` → Developer mode → Load unpacked → pick `dist/`.

- [ ] **Step 3: Run `pnpm web:dev` and walk each station**

```bash
pnpm web:dev
```

For each of `/lab/plain`, `/lab/inline`, `/lab/important-wars`:

- Open the side panel, click PICK ELEMENT, pick something on the page.
- Confirm the picker outline draws correctly.
- Edit one property (padding works for everything).
- Confirm the live preview applies on the page.
- Click Copy Patch.
- Paste the JSON into a JSON validator. Confirm `stylingSystem` is `"plain"` for all three (the `StylingSystem` type in `src/shared/types.ts` is `"tailwind" | "css-in-js" | "plain"`; CSS Modules and inline both report as "plain").
- For `/lab/important-wars`: confirm the edit *visibly overrides* the page's existing `!important` rules. If it doesn't, the injector is broken — file an extension bug, do NOT modify the station.

- [ ] **Step 4: Document any observations**

If a station behaved unexpectedly — or revealed a real extension bug — append a brief note to `web/CLAUDE.md` under a new "Known issues" section. The station's job is to fail authentically; do not paper over the failure.

- [ ] **Step 5: Commit any documentation updates**

```bash
git add web/CLAUDE.md
git commit -m "docs(web): record Phase 3 station observations"
```

(If no observations, no commit.)

---

## Phase 4 · Framework-heavy stations — invokes `frontend-design`

### Task 16: Set up Tailwind v3 scoped to `app/lab/tailwind/**`

**Files:**
- Create: `web/tailwind.config.ts`
- Create: `web/postcss.config.js`
- Create: `web/app/lab/tailwind/tailwind.css`
- Modify: `web/package.json` (add Tailwind dev deps)

- [ ] **Step 1: Install Tailwind**

```bash
cd web && pnpm add -D tailwindcss@^3 postcss autoprefixer && cd ..
```

- [ ] **Step 2: Create `web/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/lab/tailwind/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

> The scoping is enforced by the `content` glob. Utility classes used
> outside `app/lab/tailwind/` are never compiled, so they have no effect.

- [ ] **Step 3: Create `web/postcss.config.js`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 4: Create `web/app/lab/tailwind/tailwind.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Verify the build**

```bash
pnpm web:typecheck
pnpm web:build
```

Both exit 0. The build output should NOT include Tailwind base styles for routes outside `/lab/tailwind`. (Phase 4 frontend-design will create the actual layout that imports `tailwind.css`.)

- [ ] **Step 6: Commit**

```bash
git add web/tailwind.config.ts web/postcss.config.js web/app/lab/tailwind/tailwind.css web/package.json web/pnpm-lock.yaml
git commit -m "feat(web): scaffold Tailwind v3 scoped to app/lab/tailwind/**"
```

---

### Task 17: Set up styled-components SSR registry scoped to `app/lab/css-in-js/**`

**Files:**
- Create: `web/app/lab/css-in-js/registry.tsx`
- Create: `web/app/lab/css-in-js/layout.tsx`
- Modify: `web/next.config.ts`
- Modify: `web/package.json` (add `styled-components`)

- [ ] **Step 1: Install styled-components**

```bash
cd web && pnpm add styled-components@^6 && pnpm add -D @types/styled-components && cd ..
```

- [ ] **Step 2: Enable the styled-components SWC transform**

Modify `web/next.config.ts` to add `compiler.styledComponents`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  compiler: { styledComponents: true },
  outputFileTracingRoot: "../",
};

export default nextConfig;
```

- [ ] **Step 3: Create the SSR registry**

`web/app/lab/css-in-js/registry.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

export default function StyledComponentsRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== "undefined") return <>{children}</>;

  return (
    <StyleSheetManager sheet={sheet.instance}>{children}</StyleSheetManager>
  );
}
```

- [ ] **Step 4: Create the segment layout**

`web/app/lab/css-in-js/layout.tsx`:

```tsx
import StyledComponentsRegistry from "./registry";

export default function CssInJsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StyledComponentsRegistry>{children}</StyledComponentsRegistry>;
}
```

- [ ] **Step 5: Verify the build**

```bash
pnpm web:typecheck
pnpm web:build
```

Both exit 0.

- [ ] **Step 6: Commit**

```bash
git add web/app/lab/css-in-js/registry.tsx web/app/lab/css-in-js/layout.tsx web/next.config.ts web/package.json web/pnpm-lock.yaml
git commit -m "feat(web): scaffold styled-components SSR registry scoped to /lab/css-in-js"
```

---

### Task 18: Author the Phase 4 brief

**Files:**
- Create: `docs/superpowers/briefs/2026-05-03-frontend-design-lab-frameworks.md`

- [ ] **Step 1: Create the brief covering all five framework-heavy stations**

The brief MUST include:

- Same "Hard rules" + "Voice rules" sections as Phase 2 brief, **except**: Tailwind is permitted (and required) inside `app/lab/tailwind/**`; styled-components is permitted (and required) inside `app/lab/css-in-js/**`. CSS Modules is required for station 03.
- The shared `<StationFrame />` is already built (Phase 3) — reuse it.
- Files to create:
  - **Station 02:**
    - `web/app/lab/tailwind/layout.tsx` — imports `./tailwind.css`, wraps children in `<StationFrame stationNumber="02" stationName="TAILWIND UTILITIES" testsBox={...} />`.
    - `web/app/lab/tailwind/page.tsx` — pricing-card grid (3 cards, `grid grid-cols-3 gap-4`), hero card with utility wall (`bg-zinc-900 text-zinc-50 ring-1 ring-zinc-800/60 px-6 py-4 rounded-md`), and a button with real hover/focus utilities (`hover:bg-zinc-700 focus-visible:ring-2`).
  - **Station 03:**
    - `web/app/lab/modules/page.tsx` — multiple components rendering with hashed classes.
    - `web/app/lab/modules/Modules.module.css` — at least 4 distinct class definitions (`.heroTitle`, `.heroBody`, `.cardLabel`, `.cardValue`).
  - **Station 04:**
    - `web/app/lab/css-in-js/page.tsx` — 3–4 styled components, including one with a `$variant` prop (e.g. a `<StyledButton $variant="primary" | "secondary">` that changes background by variant).
    - `web/app/lab/css-in-js/components.tsx` — the actual styled definitions (`"use client"`).
  - **Station 06:**
    - `web/app/lab/deep-dom/page.tsx` — a `position: fixed` header bar at the top of the page, an 8-level deep nested tree, a `setInterval` ticker that mutates `textContent` every 2 seconds (cleanup on unmount, no leaks), and a button that toggles a subtree's IDs and order.
  - **Station 07:**
    - `web/app/lab/shared-grid/page.tsx` — 12 `<article class="card">` items with identical inner structure (placeholder image div, h3, p, footer).
    - `web/app/lab/shared-grid/shared-grid.module.css`.
- Per-station WHAT THIS TESTS box copy verbatim from the spec (paste each one inline in the brief).
- Definition of done: all listed files exist; `pnpm web:typecheck`, `pnpm web:lint`, `pnpm web:build` clean; each station route loads; the Tailwind station's compiled stylesheet is segment-scoped (verify by visiting `/` and confirming no `bg-zinc-900` class is in the rendered HTML); the css-in-js station server-renders with no FOUC; the deep-dom ticker doesn't leak intervals (verify in DevTools → Performance → Memory between mounts).

- [ ] **Step 2: Commit the brief**

```bash
git add docs/superpowers/briefs/2026-05-03-frontend-design-lab-frameworks.md
git commit -m "docs: brief for frontend-design — framework stations (Phase 4)"
```

---

### Task 19: Invoke `frontend-design` for Phase 4

- [ ] **Step 1: Invoke `frontend-design`**

Use the `Skill` tool with `frontend-design:frontend-design` and pass the contents of `docs/superpowers/briefs/2026-05-03-frontend-design-lab-frameworks.md`.

- [ ] **Step 2: Review the output**

Confirm exactly the files in the brief were created. Reject and re-prompt if:
- Tailwind utilities appear outside `app/lab/tailwind/`.
- styled-components appears outside `app/lab/css-in-js/`.
- The deep-dom ticker uses `setInterval` without a cleanup `useEffect` return.
- The css-in-js station's variant component doesn't actually generate different `sc-*` classes per variant.
- The shared-grid station doesn't have exactly 12 cards.

- [ ] **Step 3: Run the verification gate**

```bash
pnpm web:typecheck
pnpm web:lint
pnpm web:build
```

All exit 0.

- [ ] **Step 4: Confirm Tailwind isolation**

`pnpm web:dev`. Visit http://localhost:3000. View Source. Confirm no `bg-zinc-*` or other Tailwind utility classes appear in the rendered HTML. Then visit http://localhost:3000/lab/tailwind and confirm Tailwind utilities are present.

- [ ] **Step 5: Confirm css-in-js SSR**

```bash
curl -s http://localhost:3000/lab/css-in-js | grep -E "sc-[a-z0-9]+"
```

Expected: at least one `sc-*` class in the server-rendered HTML, proving SSR is wired correctly. (No FOUC.)

- [ ] **Step 6: Commit**

```bash
git add web/app/lab/
git commit -m "feat(web): framework stations 02, 03, 04, 06, 07 (frontend-design output)"
```

---

### Task 20: Phase 4 verification gate (with extension)

> Same Chrome-required caveat as Task 15.

- [ ] **Step 1: Build extension and load unpacked**

```bash
pnpm build
```

Then in Chrome: `chrome://extensions` → reload the loaded unpacked extension.

- [ ] **Step 2: Walk each framework station**

`pnpm web:dev`. For each of `/lab/tailwind`, `/lab/modules`, `/lab/css-in-js`, `/lab/deep-dom`, `/lab/shared-grid`:

- Pick an element. Confirm the outline draws correctly.
- For `/lab/tailwind`: edit padding on the button, then switch the panel's state tab to `:hover`. The panel should show a value→utility hint when entering a Tailwind-mappable value. Force-preview should apply the hover state.
- For `/lab/modules`: pick the heading. The panel's selector should NOT be the raw `Modules_heroTitle__abc12` class — it should be the extracted `heroTitle`.
- For `/lab/css-in-js`: pick a styled component. The panel should NOT use the `sc-bdVaJa` class as the selector — it should fall back to a structural one.
- For `/lab/deep-dom`: pick a deeply nested element. Use ↑/↓ to walk ancestors. Confirm the picker outline survives the ticker mutation. Confirm picking the `position: fixed` header works (outline positions correctly).
- For `/lab/shared-grid`: pick one card. The panel should surface "11 similar elements found · apply to all?". Apply to all and copy patch — `siblingGroup` field should be populated, not `null`.

- [ ] **Step 3: Document observations**

Append any findings to `web/CLAUDE.md` Known Issues. The station's job is to fail authentically.

- [ ] **Step 4: Commit any docs updates**

```bash
git add web/CLAUDE.md
git commit -m "docs(web): record Phase 4 station observations"
```

(Skip if no observations.)

---

## Phase 5 · Vercel deploy

### Task 21: Create `vercel.json` and link the project

**Files:**
- Create: `vercel.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create `vercel.json` at the repo root**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install && pnpm --dir web install",
  "buildCommand": "pnpm tokens && pnpm --dir web build",
  "outputDirectory": "web/.next",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Link the Vercel project**

```bash
cd web && pnpm dlx vercel link && cd ..
```

When prompted:
- Set up and deploy? → Yes
- Scope → user's personal scope
- Link to existing project? → No (create new)
- Project name → `css-wrangler` (or user's preference)
- Root directory → `./` (the CLI is running inside `web/`)
- Override settings? → No (Vercel will autodetect Next.js + read `vercel.json` from repo root via the build context)

> Note on root directory: the Vercel project's root must be set to `web/`
> (relative to repo root) so Vercel runs `next build` in that directory.
> If the CLI doesn't ask, set it manually in the Vercel dashboard under
> Settings → General → Root Directory = `web`.

- [ ] **Step 3: Add `web/.vercel/` to `.gitignore`**

Append to root `.gitignore`:

```
web/.vercel
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json .gitignore
git commit -m "feat(deploy): vercel.json + project link for web/"
```

---

### Task 22: Trigger a preview deploy

- [ ] **Step 1: Push the branch**

```bash
git push -u origin landing-page
```

- [ ] **Step 2: Open a PR against `main`**

```bash
gh pr create --base main --title "feat: landing page at web/" --body "$(cat <<'EOF'
## Summary
- Adds web/ Next.js landing page (Vercel-deployed)
- / marketing route + /lab regression bench (8 stations)
- Tokens shared with extension via existing codegen, second output

## Test plan
- [ ] Vercel preview deploy succeeds
- [ ] Preview / renders, all copy verbatim from spec
- [ ] Preview /lab index links to all 8 stations
- [ ] Preview /lab/tailwind Tailwind utilities render; / does not have any
- [ ] Preview /lab/css-in-js SSRs sc-* classes (no FOUC)
- [ ] Lighthouse mobile >= 95 on /
- [ ] No third-party domains in preview Network tab
- [ ] CWS button shows tooltip and is unclickable
- [ ] GitHub link works

Spec: docs/superpowers/specs/2026-05-03-landing-page-design.md
EOF
)"
```

- [ ] **Step 3: Wait for the preview deploy and run the test plan**

The PR comment will include a Vercel preview URL. Open it.

Run the manual test plan from the PR body. Each item must check.

If the preview deploy fails, read the build logs (`vercel inspect <url> --logs` or via the Vercel dashboard). The most likely failure modes:
- `pnpm tokens` fails on Vercel because `js-yaml` is in root devDependencies — confirm it's a `devDependency` and that `pnpm install` ran in repo root, not just in `web/`.
- Path alias `@shared/*` fails because `outputFileTracingRoot` didn't pick up `../src`. Confirm `web/next.config.ts` has `outputFileTracingRoot: "../"`.

- [ ] **Step 4: Document any preview-specific fixes**

If the deploy required tweaks, commit them and re-push.

---

### Task 23: Promote to production

- [ ] **Step 1: Merge the PR**

When the preview test plan checks out, merge the PR into `main`. Vercel automatically deploys `main` to production.

- [ ] **Step 2: Run the production verification**

Visit the production URL (set in `vercel.json` or the dashboard). Repeat the test plan from Task 22 Step 2.

- [ ] **Step 3: Final spec verification**

Confirm the project meets the spec's "Verification gates":

```bash
pnpm typecheck && pnpm web:typecheck \
  && pnpm lint && pnpm web:lint \
  && pnpm tokens:check \
  && pnpm build && pnpm web:build
```

All exit 0.

Plus manual:
- Production URL serves both routes.
- Lighthouse mobile ≥ 95 on `/`.
- No third-party domains in production Network tab.
- CWS button shows tooltip and is unclickable.
- GitHub link works.
- Mobile viewport renders without horizontal scroll.

- [ ] **Step 4: Done**

Plan complete.

---

## Appendix · How to swap the CWS link when the extension publishes

Single-file change in `web/app/components/InstallCTA.tsx`:

1. Change the primary button from `<button disabled>` to `<a href="https://chromewebstore.google.com/detail/...">`.
2. Remove the tooltip wrapper.

The InstallSection (numbered command-list) can either stay (still useful for source builds) or be replaced with a single one-line "Install from the Chrome Web Store" pointer to the primary button. Decision belongs to whoever flips the switch.
