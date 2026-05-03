# Figma Plugin Bridge — Design Spec

> **Date:** 2026-05-03
> **Branch:** `figma-bridge`
> **Status:** Approved for implementation planning

## Problem

The CSS Wrangler Chrome extension lets Kyle visually edit CSS on any page
and ship a structured patch to Claude/Codex. Today the design source
(Figma) and the production surface (browser) are completely disconnected.
Iterating means tweaking in one tool, eyeballing the other, and manually
reconciling.

A Figma plugin paired with the existing extension would let changes flow
both ways:

- **Forward:** make a change in Figma → push to the live page in the
  browser → visually verify → ship the patch to Claude (existing flow).
- **Reverse:** make a change in the browser via the Chrome extension →
  push back into Figma so the design file matches what shipped.

## Goals

- Bidirectional sync between a Figma plugin and the existing Chrome
  extension on Kyle's local machine.
- Sub-100ms latency on the live-preview loop (Figma edit → browser apply).
- No change to the existing patch-to-Claude clipboard flow — it stays as
  the canonical handoff to code.
- Single user, single machine, single project at a time. No cloud, no
  multi-tenant, no auth beyond "localhost only."

## Non-goals (explicitly deferred)

- MCP server for automatic patch ingestion in Claude. The bridge daemon
  is positioned to host one later, but it's not v0.
- Persistent element ↔ node pairing. v0 is selection-based only.
- Token sync between Figma variables and CSS design tokens.
- Figma effects, gradients, transforms, transitions, constraints,
  mixed-value selections.
- Live-sync (auto-push on every Figma value change). Push is explicit.
- Multi-page Figma file traversal. Current page selection only.
- Cloud relay, multi-user, sharing.

## Architecture

```
┌────────────────┐   ws://localhost:9123    ┌──────────────────┐
│  Figma plugin  │ ◄─────────────────────►  │  Bridge daemon   │
│  (UI iframe +  │                          │  (Node CLI in    │
│   plugin code) │                          │   bridge/)       │
└────────────────┘                          └────────┬─────────┘
                                                     │ ws
                                                     ▼
                                          ┌──────────────────────┐
                                          │  Chrome ext (panel)  │
                                          │  src/panel/          │
                                          └──────────┬───────────┘
                                                     │ chrome.runtime
                                                     ▼
                                          ┌──────────────────────┐
                                          │  Chrome ext (content)│
                                          │  src/content/        │
                                          └──────────────────────┘
```

The daemon is a **dumb relay**. It holds no CSS state, no pairings — it
routes typed messages between connected clients and logs connection
churn. State (current target, baseline values) lives in the plugin and
the panel, which already manage it.

### Why a WebSocket daemon vs alternatives

- **MCP-mediated transport:** wrong primitive. Each round-trip is a
  Claude turn — incompatible with the live-preview loop.
- **File-watch:** Figma plugin iframes can't watch the local filesystem.
  Would require a local HTTP endpoint anyway, at which point WebSocket
  is strictly better.
- **Native Messaging:** removes the "did you start the bridge?" runtime
  friction but adds per-OS install of a host manifest. Worse trade for a
  personal tool.
- **Cloud relay:** overkill. Adds latency, an account, an auth story.

### Identity model: selection-based, no pairing

Each side maintains a **current target**:

- Figma plugin tracks `figma.currentPage.selection[0]`.
- Chrome extension already tracks the picked element via the
  `__wrangler-{nanoid}` class.

A "Push" button on either side reads the current target's properties,
diffs them against the baseline, and sends a typed message. The other
side applies to *its* current target.

**No persistent pairing, no Code Connect dependency, no auto-matching by
text/role/position.** The user is the conflict resolver — explicit push
overwrites.

To reduce the "what's selected on the other side?" cognitive load:

- Both UIs **echo their selection** over the bridge whenever it changes.
- Each side displays "Other side targeting: `<button.cta>`" or
  "← Figma target: `Frame "Button/Primary"`" prominently.

## Components

### `bridge/` — Node WebSocket daemon

Single small package. ~150 LOC. Only dependency: `ws`.

- `bridge/src/server.ts` — WS server, accepts any number of clients,
  broadcasts inbound messages to all *other* clients, prints connection
  log to stdout.
- `bridge/src/cli.ts` — entrypoint. Prints `WS listening on
  ws://localhost:9123` and the list of known message types. Dies on
  Ctrl+C.
- `bridge/package.json` — `bin: { "css-wrangler-bridge": "./dist/cli.js" }`
  for future `npx` publishing.

Started via `pnpm bridge` (added to root `package.json` scripts).

### `figma-plugin/` — Figma plugin package

Standard Figma plugin layout:

- `figma-plugin/manifest.json` — declares network access to
  `localhost:9123` (Figma plugins require explicit allowlist).
- `figma-plugin/src/code.ts` — plugin sandbox code. Reads/writes node
  properties, listens to `figma.on('selectionchange')`, posts messages
  to/from the iframe via `figma.ui.postMessage`.
- `figma-plugin/src/ui.tsx` — React iframe UI. Mirrors the bespoke
  Precision Instrument aesthetic from the panel. **Inlines design
  tokens** — Figma plugin iframes can't load arbitrary CSS files at
  runtime.
- `figma-plugin/src/mapping.ts` — pure functions: Figma node →
  `PropertyChange[]`. The mapping table:

  | Figma | CSS |
  |---|---|
  | Solid fill | `background-color`, `color` (text) |
  | Corner radius | `border-radius` |
  | Stroke | `border-color`, `border-width` |
  | Auto-layout padding | `padding-top/right/bottom/left` |
  | Auto-layout gap | `gap` |
  | Text style atoms | `font-size`, `font-weight`, `line-height`, `letter-spacing` |
  | Explicit width/height | `width`, `height` |

  Unsupported properties (gradients, effects, mixed values) get a badge
  in the UI: "skipped — not supported."

- `figma-plugin/src/apply.ts` — pure functions: `PropertyChange[]` →
  Figma node mutations. Wraps the batch in `figma.commitUndo()` so
  Figma's native undo works.
- `figma-plugin/src/bridge-client.ts` — typed WebSocket wrapper.

### `src/panel/` — Chrome extension additions

Minimal surface area. The existing edit/apply machinery does the heavy
lifting; the bridge just adds a new way to feed it.

- `src/panel/lib/bridge-client.ts` — typed WS wrapper. Mirror of the
  Figma plugin's bridge-client; both consume the shared message types.
- `src/panel/lib/figma-mapping.ts` — pure function: `PropertyChange[]` →
  payload the Figma plugin can apply. (Inverse of Figma plugin's
  `mapping.ts` for the properties that round-trip.)
- `src/panel/components/BridgeStatus.tsx` — header pill showing
  connection state: `Bridge offline` / `Connected — Figma` / `Connected
  — Figma + 1 other tab`.
- `src/panel/components/PushToFigmaButton.tsx` — explicit push button.
- `src/panel/store/editStore.ts` — two new actions: `pushSelectedToFigma()`
  and `applyFromFigma(payload)`. The latter funnels into the existing
  `applyEdit` flow so the content-script side is unchanged.

### `src/shared/bridge-messages.ts` — typed protocol

New file, sibling to `src/shared/messages.ts`. A discriminated union for
bridge traffic only (separate from `chrome.runtime` messages, which keep
their own union):

```ts
import type { PropertyChange } from "./types";

export interface TargetRef {
  /** Display name for "other side targeting: X" UI */
  display: string;
  /** "<button.cta>" / 'Frame "Button/Primary"' — purely for UI */
  kind: "dom" | "figma-node";
  /** opaque id from the source side; never resolved by the bridge */
  id: string;
}

export interface HelloMsg {
  type: "hello";
  client: "figma" | "panel";
  version: "1.0";
}

export interface PushChangesMsg {
  type: "push-changes";
  from: "figma" | "panel";
  target: TargetRef;
  changes: PropertyChange[];
}

export interface EchoMsg {
  type: "echo";
  from: "figma" | "panel";
  target: TargetRef | null; // null = nothing selected
}

export interface AckMsg {
  type: "ack";
  for: "push-changes";
  ok: boolean;
  appliedTo: TargetRef | null;
  reason?: string; // "no-target" | "clamped:padding" | "unsupported:gradient" | …
}

export type BridgeMessage = HelloMsg | PushChangesMsg | EchoMsg | AckMsg;
```

The bridge never inspects `target` or `changes` — they're opaque
payloads. The bridge only reads `type`, `client` (for routing decisions)
and `from` (for echoing).

## Data flow

### Forward — Figma → Browser

1. User selects a node in Figma. Plugin reads node properties, runs
   `mapping.ts`, displays editable fields with current values.
2. User edits a value, clicks "Push to browser."
3. Plugin sends `push-changes { from: "figma", target, changes }` over
   the bridge.
4. Daemon relays to all panel clients.
5. Panel receives → `applyFromFigma(payload)` → existing `applyEdit`
   flow → `apply-edit` message to content script → style appears on
   page.
6. Panel sends `ack { ok: true, appliedTo: <browser-target> }`.
7. Plugin shows confirmation toast.

### Reverse — Browser → Figma

1. User picks an element in the panel and edits values (existing flow,
   unchanged).
2. User clicks new "Push to Figma" button.
3. Panel sends `push-changes { from: "panel", target, changes }` over
   the bridge.
4. Daemon relays to all figma clients.
5. Plugin receives → reads `figma.currentPage.selection[0]` → runs
   `apply.ts` → mutates node inside `figma.commitUndo()`.
6. Plugin sends `ack { ok: true, appliedTo: <figma-target> }`.
7. Panel shows confirmation in the BridgeStatus pill.

### Echo (always-on)

Whenever each side's selection changes, it sends an `echo` so the other
side displays "Other side targeting: X." Pure UI feedback. No apply.

## Error handling

| Condition | Behavior |
|---|---|
| Bridge daemon not running | Both UIs show "Bridge offline — run `pnpm bridge`" with a copy button. Existing flows (clipboard patch, manual edit, force-state preview) continue to work. |
| Bridge crashes mid-session | Clients reconnect with backoff (2s → 8s capped). Reconnect banner clears when re-established. Daemon prints reconnects to stdout. |
| Push from Figma but no element picked in browser | Panel returns `ack { ok: false, reason: "no-target" }`. Plugin toast: "No element picked in browser." |
| Push from browser but no node selected in Figma | Symmetric — plugin returns `ack { ok: false, reason: "no-target" }`. |
| Unsupported Figma property in source node | Plugin shows badge: "skipped — not supported" and sends only valid changes. |
| CSS value out of Figma range when applied | Plugin clamps and returns `ack { ok: true, reason: "clamped:padding" }`. Panel shows warning. |
| Multiple panel clients (two browser tabs) | Daemon broadcasts to all panels; each applies to its own picked element. Daemon log shows which URLs responded. |
| Two Figma plugin instances connected | Same — both apply to their own selected node. Daemon doesn't deduplicate. User chaos is user's problem. |

## Repo layout

New files / directories marked **NEW**:

```
muscat/
├── bridge/                              # NEW
│   ├── package.json                     # ws dep, bin entry
│   ├── src/
│   │   ├── server.ts                    # WS server + relay
│   │   └── cli.ts                       # entrypoint
│   └── tsconfig.json
├── figma-plugin/                        # NEW
│   ├── manifest.json                    # network allowlist
│   ├── package.json
│   ├── src/
│   │   ├── code.ts                      # plugin sandbox
│   │   ├── ui.tsx                       # React iframe UI
│   │   ├── mapping.ts                   # Figma node → PropertyChange[]
│   │   ├── apply.ts                     # PropertyChange[] → Figma mutations
│   │   └── bridge-client.ts
│   └── tsconfig.json
├── src/
│   ├── panel/
│   │   ├── lib/
│   │   │   ├── bridge-client.ts         # NEW
│   │   │   └── figma-mapping.ts         # NEW
│   │   ├── components/
│   │   │   ├── BridgeStatus.tsx         # NEW
│   │   │   └── PushToFigmaButton.tsx    # NEW
│   │   └── store/editStore.ts           # MODIFIED — push/apply actions
│   └── shared/
│       └── bridge-messages.ts           # NEW — typed protocol
└── package.json                         # MODIFIED — adds "bridge" script
```

Update `CLAUDE.md` to add a fourth runtime context to the architecture
table (the bridge daemon) and document its invariants (dumb relay, no
state, localhost-only).

## Verification plan

CLAUDE.md flags automated tests as out of scope, and that holds — the
value lives in the round-trip with real Figma + real Chrome.

- **Bridge daemon smoke test:** `wscat` two clients, confirm relay.
- **Property mapping (both directions):** the only place real logic
  lives. If we add unit tests anywhere, it's `mapping.ts` and
  `figma-mapping.ts`. Pure functions, easy to test, optional for v0.
- **End-to-end manual:**
  1. `pnpm bridge` in a terminal.
  2. Load Figma plugin in dev mode against a real file.
  3. Load Chrome ext (`dist/`) and pick an element on a real page
     (github.com).
  4. Push Figma → browser: change padding on a Figma frame, verify it
     applies to the picked element.
  5. Push browser → Figma: edit padding in the panel, verify the Figma
     node updates.
  6. Verify both sides recover from killing/restarting the bridge.
  7. Verify existing clipboard patch flow is unaffected.
  8. Verify "Bridge offline" UI shows correctly when the bridge isn't
     running.

I cannot load Figma or Chrome from a Claude session. Any change touching
runtime behavior of plugin, daemon, or bridge messaging must be marked
"verified at compile time only — runtime needs human verification."

## Open questions / risks

- **Figma plugin development workflow.** Iterating on a Figma plugin
  requires reloading via the Figma desktop app. Slower than HMR. Live
  reload via the bridge itself is possible but out of scope.
- **Figma plugin bundling.** Plugin code runs in a sandboxed iframe.
  Need a small build pipeline (`esbuild` likely, mirroring something
  light). Decision punted to the implementation plan.
- **Token / variable sync** is explicitly deferred but will be the most
  valuable follow-up. The plugin should at least *display* which
  variable a fill resolves to in the UI, even if it doesn't sync — so
  the v0 mapping should preserve enough info to make that easy later.
- **Manifest network permission.** Figma requires explicit allowlist
  for network access. `localhost:9123` works but is brittle if the port
  is taken. Punt port-conflict handling to the implementation plan.
