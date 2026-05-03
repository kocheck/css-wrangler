# CSS Wrangler

You open DevTools, find the element, copy the selector, open your editor, grep for
it, edit the value, save, reload, and squint. You do this seventeen times for one
button.

CSS Wrangler skips all of that.

Pick any element on any page. Tweak it live. Hit **Copy Patch** — you get a
structured JSON diff wired straight into Claude Code. No more describing what you
want. No more guessing which selector wins. Just: see it, change it, ship it.

Built for the loop that actually happens: browser → editor → browser → editor →
*why does it still look wrong* → repeat. CSS Wrangler closes the lossy middle.

---

## What it does

- **Pick** any element on the page — keyboard-navigable, DOM-walker included
- **Edit** live: typography, spacing, borders, background, layout — the full Tier 1
  property set, with a panel that looks like a precision instrument, not a toy
- **Preview** instantly via injected `<style>` with `!important` + a unique
  `__wrangler-{id}` class. Beats specificity wars. Survives SPA re-renders.
- **Copy Patch** → markdown-fenced JSON on your clipboard, ready to paste into
  Claude Code. It includes selectors, property values, the styling system it
  detected (Tailwind, CSS Modules, plain), and sibling groups for shared edits.
- **Clear all** → everything gone, page restored, like you were never there
- **Reload** → same. Session-only by design. The patch is the artifact.

---

## Install

```bash
pnpm install
pnpm build
```

Then in Chrome:

1. `chrome://extensions` → enable **Developer mode** (top right)
2. **Load unpacked** → pick the `dist/` folder
3. Navigate to any site → click the **CSS Wrangler** icon in the toolbar
4. Side panel opens — click **Pick element** and start wrangling

For active development with panel HMR:

```bash
pnpm dev
```

Load `dist/` the same way. crxjs handles HMR for the panel; after touching the
content script or service worker, reload the extension manually in
`chrome://extensions`.

---

## The patch format

The clipboard output is the contract. Versioned at `"version": "1.0"`. Downstream
consumers (Claude Code, future CLI) pattern-match on it, so its shape is stable.

A patch looks like:

```json
{
  "version": "1.0",
  "edits": [
    {
      "selector": ".hero-cta",
      "stylingSystem": "tailwind",
      "property": "padding",
      "from": "12px 24px",
      "to": "16px 32px",
      "tailwindHint": "py-4 px-8",
      "siblingGroup": null
    }
  ]
}
```

Claude Code reads this and lands the change in the right file on the first try.
That's the whole point.

---

## Roadmap

**Tier 2 — next**
- `:hover` / `:focus-visible` editing with force-state preview (injector already
  supports the sibling-class trick — UI just needs to expose it)
- Undo (`⌘Z` / `Ctrl+Z`) per-edit
- Similar-element detection for shared class edits

**Tier 3 — after that**
- Responsive breakpoints with viewport simulation
- Patch output emits `@media` rules grouped by breakpoint

**Future**
- CLI bridge (`css-wrangler watch`) that writes patches to
  `~/.css-wrangler/latest.json` so Claude Code can read without paste

---

## Architecture

Three runtime contexts, one message contract.

```
background/   service worker — opens the side panel, nothing else
content/      in-page: picker overlay, injected <style>, MutationObserver
panel/        React side panel, edit store (zustand), patch builder
shared/       types, message union, constants
```

Content script owns the DOM. Panel owns edit state. Service worker is just a
launcher. They talk via a typed discriminated union in `src/shared/messages.ts`.
MV3 ephemeral constraints apply: nothing meaningful lives in the service worker,
all state is panel-side, reload wipes everything intentionally.

---

## Design

The panel is a Precision Instrument. Dark. Dense. Monospace numerals. Zero
decorative chrome. It's meant to look like something you'd trust for actual work,
not a toy someone shipped in a weekend hackathon (even if it kind of was).

Aesthetic source of truth: [`DESIGN.md`](./DESIGN.md).  
Token source of truth: the YAML frontmatter in that same file.

```bash
pnpm tokens          # regenerate tokens.css from DESIGN.md frontmatter
pnpm tokens:check    # CI: fail on drift
```

Never edit `tokens.css` directly. It has an `AUTO-GENERATED` header. It means it.

---

## License

MIT.
