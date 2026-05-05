# CLAUDE.md — CSS Wrangler

> Read this first. It encodes the non-obvious invariants that, if you violate
> them, will silently break the extension or the patch format.

## What this is

A Chrome MV3 extension that lets Kyle visually edit CSS on any page and
copy a structured JSON patch into Claude Code. The patch is the API — its
shape is the contract with downstream consumers.

Spec lives at `.context/attachments/pasted_text_2026-05-02_05-42-23.txt`.
That's the source of truth for what the extension is supposed to do. Read
it before redesigning anything.

## Four runtime contexts (architecture map)

| Context | File | Owns | Constraints |
|---|---|---|---|
| **Service worker** | `src/background/service-worker.ts` | Just opens the side panel on action click | MV3 ephemeral — dies after ~30s idle. **Never** put state here. |
| **Content script** | `src/content/*` | DOM: picker overlay, injected `<style>`, `__wrangler-{id}` classes, MutationObserver, breakpoint wrapper | Stateful but ephemeral. Wiped on reload. Cannot import npm packages directly (crxjs bundles). |
| **Side panel** | `src/panel/*` | Edit list, undo history, similar-element review UI, patch generation, clipboard | React + zustand. Tells the content script *what* to apply; never touches the page DOM directly. |
| **Bridge daemon** | `bridge/src/cli.ts` | WebSocket relay between Figma plugin and panel | Localhost only. Dumb relay — no CSS state, no pairings. Reads `WRANGLER_BRIDGE_PORT` env var. |

They communicate via `chrome.runtime` with a typed discriminated union in
`src/shared/messages.ts`. **Always** add a new message type there (both
ends pattern-match). Never use raw `chrome.runtime.sendMessage` —
go through `src/panel/store/messageBridge.ts`.

## The non-obvious invariants

Violating any of these will silently break things. In rough priority order:

1. **Edits are session-only, in-memory.** No `storage` permission. Reload =
   fresh slate. This is intentional — the design assumes the patch is the
   only artifact worth keeping.

2. **Every injected rule uses `!important` AND a unique
   `__wrangler-{nanoid}` class.** Both. Specificity alone isn't enough on
   pages with `!important` already; `!important` alone loses to higher
   specificity. Together they win.

3. **The `<style id="__css-wrangler-styles">` tag must be at the *end* of
   `<head>`** to win source-order ties. The MutationObserver re-appends it
   if anything moves it. See `reattachStyleTag()` in `injector.ts`.

4. **Force-state preview uses a sibling class trick — never rewrite
   `:hover` rules.** The injected rule is
   `.__wrangler-abc:hover, .__wrangler-abc.__force-hover { … }`. The
   `__force-hover` class is added/removed on toggle. Real `:hover`
   keeps working. Same pattern for `__force-focus`. (Tier 2 — UI not
   built yet, but the injector machinery is in place.)

5. **The MutationObserver must be RAF-throttled and disconnected on
   `pagehide`.** Without throttling, large React re-renders thrash. See
   `observer.ts`. If you add new mutation handling, throttle it through
   the existing scheduled-RAF.

6. **Selector denylist lives in one place: `src/content/selectors.ts`.**
   When a new framework's mangled classes show up (e.g. webpack
   css-loader's `Name-module__class__hash` was added in this session), add
   the pattern to `GENERATED_CLASS_PATTERNS` or
   `extractCssModulesName()`. **Test against a real page before shipping.**
   False positives (matching real classes) are worse than false negatives.

7. **Patch JSON format is versioned (`"version": "1.0"`).** Bumping it is
   a breaking change for downstream Claude Code. Most additions can stay
   backward-compatible; only bump when a field's *meaning* changes.

8. **`siblingGroup` ID groups edits applied to similar elements.** The
   downstream Claude is told to apply them as a single source change
   (e.g. updating a shared class). Don't generate sibling groups for
   one-off edits — that misleads the consumer.

9. **CSS Wrangler's own classes use the `__wrangler-` prefix. Never
   change it.** It's how `Clear all`, `getStableClasses`, and the cleanup
   path identify our own DOM additions.

10. **DESIGN.md frontmatter is the canonical source of truth for design
    tokens.** Code wins; Figma is an editable mirror reconciled at merge
    time. Edit the YAML, run `pnpm tokens`, run `pnpm tokens:push`, paste
    the resulting `.figma/push-patch.js` into Figma, refresh
    `.figma/figma-state.json` via the EXPORT_SNIPPET, commit. Never
    hand-edit `tokens.css` — it has an `AUTO-GENERATED` header for a
    reason. CI gates two drift checks on every PR touching these files:
    `pnpm tokens:check` (DESIGN.md ↔ tokens.css) and `pnpm
    tokens:check-figma` (DESIGN.md ↔ Figma snapshot). The full workflow
    is in `.claude/figma-sync.md`.

11. **The bridge daemon is a dumb relay. Never put CSS state in it.**
    All target tracking and baseline values live in the plugin and the
    panel. The bridge only routes typed messages; it never inspects
    `target` or `changes`. Adding logic here would couple two contexts
    that were deliberately decoupled.

12. **Figma plugin imports from `src/shared/` use relative paths**
    (`../../src/shared/…`). The plugin lives in its own workspace with
    its own tsconfig and esbuild bundle; path aliases would require
    syncing two build systems. Relative imports are the consciously
    accepted ugliness.

## Code conventions

- **TypeScript strict + `noUncheckedIndexedAccess`.** No `any`. No
  non-null assertions (`!`). Biome enforces both.
- **Path aliases:** `@shared/`, `@panel/`, `@content/`. Defined in
  `tsconfig.json` AND `vite.config.ts` — both must stay in sync.
- **Discriminated unions** for messages (`src/shared/messages.ts`). Each
  type has a literal `type` field. Both ends switch on it.
- **`PROPERTY_GROUPS` in `src/shared/constants.ts`** drives which
  properties show in the panel UI and which the content script captures.
  To add a new editable property: add to `TIER_1_PROPERTIES` AND a group
  in `PROPERTY_GROUPS`. The PropertyRow component dispatches by
  property name.
- **Hand-rolled inline SVGs only.** No Lucide, no Heroicons, no icon
  libraries. The Precision Instrument aesthetic forbids it (see
  `DESIGN.md`).
- **No UI library.** No shadcn, no Radix. The bespoke aesthetic is the
  point.
- **Comments only when the *why* is non-obvious.** Don't explain *what*
  the code does — well-named identifiers handle that. A comment that
  says "this is a workaround for X" or "this trick wins specificity"
  earns its keep.

## Build & reload workflow

```bash
pnpm dev          # HMR for the panel; content + SW need manual reload
pnpm build        # full production build → dist/
pnpm tokens             # regenerate tokens.css from DESIGN.md frontmatter
pnpm tokens:check       # CI gate: fail if tokens.css drifts from DESIGN.md
pnpm tokens:push        # generate .figma/push-patch.js (DESIGN.md → Figma)
pnpm tokens:check-figma # CI gate: fail if Figma snapshot drifts from DESIGN.md
pnpm tokens:pull        # optional: Figma → DESIGN.md (designer-first edits)
pnpm typecheck
pnpm lint
```

After a code change, what to do in Chrome:
- **Panel only** → Vite HMR handles it. Nothing to do.
- **Content script** → reload extension in `chrome://extensions` → refresh
  the target tab.
- **Service worker** → reload extension.
- **Manifest** → reload extension.

The first time you load the extension: `chrome://extensions` → Developer
mode on → **Load unpacked** → pick `dist/`.

### Bridge / Figma plugin

```bash
pnpm bridge          # WS daemon on ws://localhost:9123
pnpm figma:build     # Figma plugin → figma-plugin/dist/
pnpm figma:watch     # rebuild on changes (still need to reload plugin in Figma desktop)
pnpm figma:typecheck # type-only check for the plugin workspace
pnpm bridge:typecheck
```

After plugin code changes: rebuild (`pnpm figma:build`) → in Figma
desktop, **Plugins → Development → Show/hide plugin** and rerun.

## How to add common things

### A new editable property

1. Add to `TIER_1_PROPERTIES` in `src/shared/constants.ts`.
2. Add to the matching `PROPERTY_GROUPS` block (typography, spacing,
   borders, background, layout).
3. If it's not numeric/color/enum/text, add a new branch in
   `PropertyRow.tsx`.
4. If it has a Tailwind mapping, add to `src/panel/lib/tailwind-hint.ts`.

### A new message type

1. Add the interface to `src/shared/messages.ts` and put it in the right
   union (`PanelToContent` or `ContentToPanel`).
2. Handle it in the receiving end's switch — the discriminated union
   forces exhaustiveness.

### A new selector heuristic

`src/content/selectors.ts`. If it's a "deny this generated pattern" rule
→ `GENERATED_CLASS_PATTERNS`. If it's "extract the meaningful part of a
mangled class" → add a new extractor next to `extractCssModulesName`.
Test against a real page (github.com, tailwindcss.com, a CSS-in-JS app).

### A new design token

Edit DESIGN.md frontmatter. Run `pnpm tokens`. Run `pnpm tokens:push`.
**Default execution path: drive the Figma round-trip via the `use_figma`
MCP — never stop at "paste this into Figma".** Run the contents of
`.figma/push-patch.js` against `fileKey 72WgrM79k7HUcFHYVFgpfC`, then run
the EXPORT_SNIPPET (bottom of `scripts/sync-figma-tokens.mjs`) and write
the JSON return value into `.figma/figma-state.json`. Verify with `pnpm
tokens:check-figma`. Commit DESIGN.md + both `tokens.css` outputs + both
`.figma/` artifacts. CI gates `tokens:check` and `tokens:check-figma` on
every PR. Manual paste is only a fallback when the Figma MCP is
unreachable.

The Figma↔DESIGN.md mapping rules and the full workflow (including the
Figma-first `tokens:pull` reverse path) are documented in
`.claude/figma-sync.md`. The mapping schema lives in code at
`scripts/lib/figma-token-map.mjs` — that's the single source for the four
sync scripts.

### A new state (Tier 2)

`hover` and `focus` are wired through `CssState`. The injector already
handles them (sibling-class trick). To expose in the UI: add a state-tab
component, pass `state` through `applyChange`. Don't add a fourth state
without a strong reason — the spec is `default | hover | focus` only.

### A new breakpoint (Tier 3)

`BREAKPOINTS` in `src/shared/constants.ts` is the source of truth.
Add the key, add it to the `BreakpointKey` type. The injector already
groups rules by breakpoint into `@media` queries. UI for switching
breakpoints is Tier 3.

### A new property to the Figma ↔ CSS round-trip

1. Add the read in `figma-plugin/src/mapping.ts` (Figma → `PropertyChange`).
2. Add the apply in `figma-plugin/src/apply.ts` (`PropertyChange` → Figma node).
3. Property must already exist in `TIER_1_PROPERTIES`. If it doesn't,
   add it there first (see "A new editable property" above).
4. Manually verify the round-trip on a real Figma file + real page.

## What's intentionally deferred

Don't reinvent these in v0:

- **Tier 2** — hover, focus, undo button, similar-element detection
  (HIGH-confidence tier). Engineering ready; UI not built.
- **Tier 3** — responsive breakpoints, viewport simulation, `@media` in
  the patch.
- **Tier 4** — CLI bridge (`css-wrangler watch`). Patch format already
  references the stable file location (`~/.css-wrangler/latest.json`)
  so the CLI can be added without breaking the contract.
- **Out of scope (per spec):** pseudo-elements, transforms, animations,
  transitions, Shadow DOM, iframes, CSS custom properties, settings
  panel, AI-suggest, automated tests.

If you're tempted to add any of these, check the spec first. Most are
deliberate cuts.

## Verification before claiming done

- `pnpm typecheck` clean
- `pnpm lint` clean
- `pnpm tokens:check` clean (if you touched DESIGN.md or tokens.css)
- `pnpm build` clean
- **Manual end-to-end** on github.com (real-world DOM):
  1. Load `dist/` unpacked
  2. Pick an element
  3. Edit padding + bg-color
  4. Live preview applies
  5. Copy patch → paste into a JSON validator → matches spec format
  6. Clear-all wipes the page
  7. Reload also wipes
- For selector or detection changes, also test on **tailwindcss.com**
  (Tailwind detection path) and a **local CSS-in-JS app** (CSS modules
  detection path).

I cannot load Chrome from a Claude session. If a change touches runtime
behavior (picker, message passing, live edit), say "verified at compile
time only — runtime needs human verification" rather than claiming
success.

## Repo layout

```
muscat/
├── src/
│   ├── manifest.ts                    # MV3 manifest as TS (crxjs compiles to JSON)
│   ├── background/service-worker.ts   # opens side panel
│   ├── content/                       # in-page work
│   │   ├── index.ts                   # entry + message handler
│   │   ├── picker.ts                  # crosshair overlay + DOM walk
│   │   ├── injector.ts                # <style> + class lifecycle
│   │   ├── observer.ts                # MutationObserver re-apply
│   │   ├── selectors.ts               # ranked candidates + denylist
│   │   ├── styling-detect.ts          # tailwind / css-in-js / plain
│   ├── panel/
│   │   ├── App.tsx
│   │   ├── components/                # bespoke React components
│   │   ├── store/
│   │   │   ├── editStore.ts           # zustand
│   │   │   └── messageBridge.ts       # typed chrome.tabs.sendMessage wrapper
│   │   ├── lib/
│   │   │   ├── patch.ts               # markdown-fenced JSON builder
│   │   │   ├── tailwind-hint.ts       # value → utility mapping
│   │   │   ├── parse-value.ts         # numeric/unit/color helpers
│   │   │   └── clipboard.ts
│   │   └── styles/
│   │       └── tokens.css             # AUTO-GENERATED from DESIGN.md
│   └── shared/
│       ├── types.ts                   # Edit, Patch, ElementRef, …
│       ├── messages.ts                # discriminated union
│       └── constants.ts               # TIER_1_PROPERTIES, BREAKPOINTS, …
├── scripts/
│   ├── build-tokens.mjs               # DESIGN.md → tokens.css codegen
│   └── tokens.css.template            # static bits (noise SVG, hairline)
├── DESIGN.md                          # aesthetic + token source of truth
├── README.md
├── .claude/repo-rules.md              # tidy-repo conventions
├── .context/                          # Conductor scratch (gitignored)
└── web/                               # Next.js landing page (separate package)
                                       # See web/CLAUDE.md for conventions
```

## When in doubt

- Spec questions → `.context/attachments/pasted_text_2026-05-02_05-42-23.txt`
- Aesthetic/tokens → `DESIGN.md`
- Build/dev workflow → `README.md`
- Repo layout/conventions → this file + `.claude/repo-rules.md`
- A weird bug in the picker, observer, or selectors → start by reproducing
  on github.com. The DOM there exercises most edge cases.
- Landing-page conventions and the test-station→feature contract →
  `web/CLAUDE.md`
