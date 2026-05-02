# CSS Wrangler

A Chrome extension that lets you visually edit CSS on any site (production or
localhost) and copy the diff as an LLM-ready patch you paste into Claude Code.

Built for the loop: see → tweak in browser → describe → fix in source. CSS
Wrangler closes the lossy middle by capturing exact selectors and changes with
source-system hints, so Claude Code lands the edit in the right files on the
first try.

## Quick start

```bash
pnpm install
pnpm build
```

Then in Chrome:

1. `chrome://extensions` → enable **Developer mode** (top right)
2. **Load unpacked** → pick the `dist/` folder
3. Open any site → click the **CSS Wrangler** action icon
4. Side panel opens — click **Pick element** and start wrangling

For development with HMR:

```bash
pnpm dev
```

then load `dist/` the same way. crxjs handles HMR for the panel; reload the
extension manually after touching the content script or service worker.

## Tier 1 (shipped in v0)

- Pick any element on the page (Esc to cancel, ↑/↓ to walk DOM)
- Edit Tier 1 properties: typography, spacing, borders, background, layout
- Live preview via injected `<style>` with `!important` + a unique
  `__wrangler-{id}` class — wins specificity, source-order, and SPA re-render
- Copy Patch → markdown-fenced JSON to clipboard, ready to paste into Claude
- Clear all → wipes every injected style and class instantly
- Reload → fresh slate, nothing persists

## Tier 2 (next)

- `:hover` / `:focus-visible` editing with force-state preview toggles
- Undo (`⌘Z` / `Ctrl+Z`) per-edit
- Similar-element detection (HIGH-confidence: same tag + same class list)

## Tier 3 (after that)

- Responsive breakpoints (mobile / tablet / desktop) with viewport simulation
- Patch output emits `@media` rules grouped by breakpoint

## Future work

- **CLI bridge** (`css-wrangler watch`): a Node CLI that monitors clipboard for
  patches and writes them to `~/.css-wrangler/latest.json` so Claude Code can
  read directly without paste. The patch format already references this stable
  location.
- Pseudo-elements (`::before`, `::after`)
- Transforms, animations, transitions
- Shadow DOM, iframes
- CSS custom properties / variables
- Settings panel, "AI suggest" features
- Automated tests (Playwright + extension loader)

## Aesthetic & design tokens

See [`DESIGN.md`](./DESIGN.md) — the panel is a deliberate Precision Instrument
aesthetic, not generic devtool chrome.

The YAML frontmatter in `DESIGN.md` is the **single source of truth** for
design tokens. `src/panel/styles/tokens.css` is generated from it:

```bash
pnpm tokens         # regenerate tokens.css
pnpm tokens:check   # CI: fail if tokens.css is out of sync
```

`pnpm dev` and `pnpm build` re-run the codegen first. To change a token,
edit the frontmatter and commit both files together. Never edit
`tokens.css` directly — it has an `AUTO-GENERATED` header for a reason.

The codegen lives in `scripts/build-tokens.mjs` and the static template
(noise SVG, hairline shorthand) is in `scripts/tokens.css.template`. The
mapping rule from frontmatter → CSS variables is documented in the
`DESIGN.md` frontmatter itself.

## Architecture

```
src/
  background/     service worker — opens side panel, otherwise idle
  content/        in-page work: picker, injector, observer, selectors
  panel/          React side panel UI, edit store, patch builder
  shared/         types + message contract + constants
```

Three runtime contexts talk via `chrome.runtime` with a typed discriminated
union (`src/shared/messages.ts`). The content script owns DOM, the panel owns
edit state, and the service worker is just a launcher.

## License

MIT.
