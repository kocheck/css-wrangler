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

## MCP server — skip the clipboard

There's a localhost MCP server that exposes the latest patch directly to Claude
Code. No clipboard hop, no window switch. Click **Copy Patch** in the panel and
ask Claude *"apply the latest CSS wrangler patch"* — Claude pulls it via the
`get_latest_patch` tool and applies it under the same instructions as the
markdown paste flow.

```bash
pnpm cli:build
```

Then add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "css-wrangler": {
      "command": "node",
      "args": ["/absolute/path/to/css-wrangler/cli/dist/cli.js", "mcp"]
    }
  }
}
```

The clipboard path still works — MCP is additive. Full surface (5 tools, 2
resources, 1 prompt) and dev workflow are documented in
[`cli/README.md`](./cli/README.md).

For tools that don't speak MCP, `css-wrangler watch` writes the latest
patch atomically to `~/.css-wrangler/latest.json`. The file-on-disk
contract is documented in [`cli/CONTRACT.md`](./cli/CONTRACT.md).

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
- Auto-push on edit-list change so Claude Code stays in sync without a
  click. Hook point is in `src/panel/components/Footer.tsx`.

---

## Figma Plugin Bridge

Sync CSS edits between Figma and the live page in your browser.

### Setup

1. Build everything once:
   ```bash
   pnpm install
   pnpm build           # Chrome extension → dist/
   pnpm figma:build     # Figma plugin    → figma-plugin/dist/
   ```
2. Load the Chrome extension: `chrome://extensions` → Developer mode →
   **Load unpacked** → pick `dist/`.
3. Load the Figma plugin: in Figma desktop, **Plugins → Development →
   Import plugin from manifest…** → pick `figma-plugin/manifest.json`.
4. Run the bridge daemon in a terminal:
   ```bash
   pnpm bridge
   # [bridge] listening on ws://localhost:9123
   ```
5. Open the Figma plugin (Plugins → Development → CSS Wrangler Bridge)
   and the Chrome extension panel. Both pills should read `BRIDGE`.

### Forward — Figma → Browser

1. In Figma, select any frame with auto-layout, fills, or text.
2. The plugin lists supported properties under **Ready to push**.
3. Pick an element on a real page (e.g. github.com) using the Chrome
   extension.
4. In the Figma plugin, click **Push to browser →**. The styles apply
   to the picked element.

### Reverse — Browser → Figma

1. Pick an element in the browser; edit any properties in the panel.
2. In Figma, select the node you want to receive the changes.
3. In the panel, click **Push to Figma**. The Figma node updates;
   `Cmd-Z` in Figma undoes the change.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `BRIDGE OFFLINE` in either UI | Run `pnpm bridge` in a terminal. |
| `No element picked in browser` | Use the Chrome extension's pick tool first. |
| `Bridge offline` flash on push | Daemon crashed or wasn't started; restart with `pnpm bridge`. |
| Changes don't apply in Figma | Check that the node supports the property (e.g. only auto-layout frames have padding). |

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
