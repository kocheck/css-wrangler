# Figma Plugin Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local WebSocket bridge daemon, a Figma plugin, and minimal Chrome extension panel additions to enable bidirectional CSS sync between Figma and the live browser. Existing patch-to-Claude clipboard flow stays unchanged.

**Architecture:** A small Node WebSocket daemon (`bridge/`) acts as a dumb relay between two clients: a new Figma plugin (`figma-plugin/`) and the existing Chrome extension panel (`src/panel/`). Each side maintains its own current target (Figma selection / picked DOM element). Push is explicit; the bridge holds no CSS state.

**Tech Stack:** TypeScript strict (existing). `ws` for the daemon. `tsx` for running the daemon. `esbuild` for the Figma plugin build. React for the plugin UI iframe (kept dependency-light, mirrors panel's bespoke aesthetic). No automated tests — CLAUDE.md flags them as out of scope; verification is `pnpm typecheck`, `pnpm build`, and a documented manual e2e checklist.

**Project conventions:** TypeScript strict + `noUncheckedIndexedAccess`. No `any`, no `!` non-null assertions. Discriminated unions for messages with literal `type` field. Hand-rolled SVGs only — no icon libraries. Comments only when the *why* is non-obvious.

**Spec:** [`docs/superpowers/specs/2026-05-03-figma-plugin-bridge-design.md`](../specs/2026-05-03-figma-plugin-bridge-design.md)

---

## Phase 1 — Foundations (sequential, must land first)

These three tasks unblock both Phase 2 and Phase 3, which can then run in parallel.

### Task 1: Add shared bridge protocol types

**Files:**
- Create: `src/shared/bridge-messages.ts`

- [ ] **Step 1: Create the shared types file**

```ts
// src/shared/bridge-messages.ts
import type { PropertyChange } from "./types";

export const DEFAULT_BRIDGE_PORT = 9123;
export const DEFAULT_BRIDGE_URL = `ws://localhost:${DEFAULT_BRIDGE_PORT}`;
export const BRIDGE_PROTOCOL_VERSION = "1.0";

export type BridgeClientKind = "figma" | "panel";

export interface TargetRef {
  /** human-readable name for the *other* side's UI to display */
  display: string;
  kind: "dom" | "figma-node";
  /** opaque to the bridge; never resolved by the relay */
  id: string;
}

export interface HelloMsg {
  type: "hello";
  client: BridgeClientKind;
  version: typeof BRIDGE_PROTOCOL_VERSION;
}

export interface PushChangesMsg {
  type: "push-changes";
  from: BridgeClientKind;
  target: TargetRef;
  changes: PropertyChange[];
}

export interface EchoMsg {
  type: "echo";
  from: BridgeClientKind;
  target: TargetRef | null;
}

export interface AckMsg {
  type: "ack";
  for: "push-changes";
  ok: boolean;
  appliedTo: TargetRef | null;
  reason?: string;
}

export type BridgeMessage = HelloMsg | PushChangesMsg | EchoMsg | AckMsg;
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: zero errors. The new file imports `PropertyChange` from existing `./types`; no other code references it yet.

- [ ] **Step 3: Commit**

```bash
git add src/shared/bridge-messages.ts
git commit -m "feat(shared): add bridge protocol message types"
```

---

### Task 2: Scaffold the bridge daemon workspace

**Files:**
- Create: `bridge/package.json`
- Create: `bridge/tsconfig.json`
- Modify: root `package.json` (add `bridge` script + dev deps)

- [ ] **Step 1: Create `bridge/package.json`**

```json
{
  "name": "@css-wrangler/bridge",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Local WebSocket bridge between the Figma plugin and the Chrome extension panel.",
  "main": "src/cli.ts",
  "bin": {
    "css-wrangler-bridge": "src/cli.ts"
  }
}
```

- [ ] **Step 2: Create `bridge/tsconfig.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["node"],
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*", "../src/shared/bridge-messages.ts", "../src/shared/types.ts", "../src/shared/constants.ts"]
}
```

- [ ] **Step 3: Add `tsx` and `ws` to root deps, plus the bridge script**

In root `package.json`, add to `dependencies`:

```json
"ws": "^8.18.0"
```

To `devDependencies`:

```json
"@types/ws": "^8.5.13",
"tsx": "^4.19.2"
```

To `scripts`:

```json
"bridge": "tsx bridge/src/cli.ts",
"bridge:typecheck": "tsc -p bridge/tsconfig.json --noEmit"
```

- [ ] **Step 4: Install the new deps**

Run: `pnpm install`
Expected: `ws`, `@types/ws`, and `tsx` resolve and install.

- [ ] **Step 5: Commit**

```bash
git add bridge/package.json bridge/tsconfig.json package.json pnpm-lock.yaml
git commit -m "feat(bridge): scaffold bridge daemon workspace"
```

---

### Task 3: Implement the bridge daemon server

**Files:**
- Create: `bridge/src/server.ts`
- Create: `bridge/src/cli.ts`

- [ ] **Step 1: Implement the relay server**

```ts
// bridge/src/server.ts
import { WebSocketServer, type WebSocket } from "ws";
import type {
  BridgeClientKind,
  BridgeMessage,
} from "../../src/shared/bridge-messages";

interface Client {
  socket: WebSocket;
  kind: BridgeClientKind | "unknown";
  id: number;
}

let nextId = 1;

export function startServer(port: number): WebSocketServer {
  const wss = new WebSocketServer({ port, host: "127.0.0.1" });
  const clients = new Set<Client>();

  wss.on("connection", (socket) => {
    const client: Client = { socket, kind: "unknown", id: nextId++ };
    clients.add(client);
    log(`+ client ${client.id} (${clients.size} total)`);

    socket.on("message", (raw) => {
      let msg: BridgeMessage;
      try {
        msg = JSON.parse(raw.toString()) as BridgeMessage;
      } catch {
        log(`! client ${client.id} sent invalid JSON`);
        return;
      }
      if (msg.type === "hello") {
        client.kind = msg.client;
        log(`= client ${client.id} hello as ${client.kind}`);
        return;
      }
      const payload = JSON.stringify(msg);
      for (const peer of clients) {
        if (peer === client) continue;
        if (peer.socket.readyState !== peer.socket.OPEN) continue;
        peer.socket.send(payload);
      }
    });

    socket.on("close", () => {
      clients.delete(client);
      log(`- client ${client.id} (${clients.size} total)`);
    });
  });

  wss.on("error", (err) => log(`! server error: ${err.message}`));

  return wss;
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[bridge ${ts}] ${msg}`);
}
```

- [ ] **Step 2: Implement the CLI entrypoint**

```ts
// bridge/src/cli.ts
import { startServer } from "./server.ts";
import { DEFAULT_BRIDGE_PORT } from "../../src/shared/bridge-messages";

const portEnv = process.env.WRANGLER_BRIDGE_PORT;
const PORT = portEnv ? Number(portEnv) : DEFAULT_BRIDGE_PORT;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`[bridge] invalid port: ${portEnv}`);
  process.exit(1);
}

const wss = startServer(PORT);
console.log(`[bridge] listening on ws://localhost:${PORT}`);
console.log(`[bridge] press Ctrl+C to stop`);

process.on("SIGINT", () => {
  console.log("\n[bridge] shutting down");
  wss.close(() => process.exit(0));
});
```

- [ ] **Step 3: Verify daemon typechecks**

Run: `pnpm bridge:typecheck`
Expected: zero errors.

- [ ] **Step 4: Smoke test the daemon manually**

Start it in one terminal: `pnpm bridge`
Expected stdout (one line): `[bridge] listening on ws://localhost:9123`

In a second terminal, run two `wscat` clients:
```bash
npx -y wscat -c ws://localhost:9123
```
In the first wscat, send: `{"type":"hello","client":"figma","version":"1.0"}`
Expected: no response (hello is not relayed).
Open a second wscat in another terminal and connect; the bridge log shows `+ client 2`.
Send `{"type":"echo","from":"figma","target":null}` from wscat #1; wscat #2 should receive it.

Stop the daemon with Ctrl+C; expect `[bridge] shutting down`.

- [ ] **Step 5: Commit**

```bash
git add bridge/src/server.ts bridge/src/cli.ts
git commit -m "feat(bridge): implement WebSocket relay daemon"
```

---

## Phase 2 — Chrome extension panel additions

Phase 2 and Phase 3 are independent after Phase 1. Either order is fine; both are needed for the e2e checklist in Task 18.

### Task 4: Implement the panel bridge client

**Files:**
- Create: `src/panel/lib/bridge-client.ts`

- [ ] **Step 1: Implement the typed WebSocket wrapper with reconnect**

```ts
// src/panel/lib/bridge-client.ts
import {
  BRIDGE_PROTOCOL_VERSION,
  DEFAULT_BRIDGE_URL,
  type BridgeMessage,
  type HelloMsg,
} from "@shared/bridge-messages";

export type BridgeStatus = "offline" | "connecting" | "connected";

type Listener = (msg: BridgeMessage) => void;
type StatusListener = (status: BridgeStatus) => void;

let socket: WebSocket | null = null;
let status: BridgeStatus = "offline";
let backoffMs = 2000;
let reconnectTimer: number | null = null;
const listeners = new Set<Listener>();
const statusListeners = new Set<StatusListener>();

const HELLO: HelloMsg = {
  type: "hello",
  client: "panel",
  version: BRIDGE_PROTOCOL_VERSION,
};

export function startBridgeClient(): void {
  if (socket) return;
  setStatus("connecting");
  let next: WebSocket;
  try {
    next = new WebSocket(DEFAULT_BRIDGE_URL);
  } catch {
    scheduleReconnect();
    return;
  }
  socket = next;
  next.addEventListener("open", () => {
    backoffMs = 2000;
    setStatus("connected");
    next.send(JSON.stringify(HELLO));
  });
  next.addEventListener("message", (ev) => {
    let msg: BridgeMessage;
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : "") as BridgeMessage;
    } catch {
      return;
    }
    for (const l of listeners) l(msg);
  });
  next.addEventListener("close", () => {
    if (socket === next) socket = null;
    scheduleReconnect();
  });
  next.addEventListener("error", () => {
    next.close();
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer != null) return;
  setStatus("offline");
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    backoffMs = Math.min(backoffMs * 2, 8000);
    startBridgeClient();
  }, backoffMs);
}

function setStatus(next: BridgeStatus): void {
  if (status === next) return;
  status = next;
  for (const l of statusListeners) l(status);
}

export function send(msg: BridgeMessage): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(msg));
  return true;
}

export function onMessage(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function onStatus(fn: StatusListener): () => void {
  statusListeners.add(fn);
  fn(status);
  return () => {
    statusListeners.delete(fn);
  };
}

export function getStatus(): BridgeStatus {
  return status;
}
```

- [ ] **Step 2: Verify panel typecheck passes**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/panel/lib/bridge-client.ts
git commit -m "feat(panel): add typed bridge WebSocket client"
```

---

### Task 5: Add the BridgeStatus header pill

**Files:**
- Create: `src/panel/components/BridgeStatus.tsx`
- Modify: `src/panel/components/Header.tsx`
- Modify: panel CSS file that styles `.status-pill` (find via `grep -l 'status-pill' src/panel/styles/`). **Do not edit `tokens.css` — it is auto-generated.**

- [ ] **Step 1: Implement the BridgeStatus component**

```tsx
// src/panel/components/BridgeStatus.tsx
import { useEffect, useState } from "react";
import { type BridgeStatus, getStatus, onStatus } from "../lib/bridge-client";

export default function BridgeStatusPill() {
  const [status, setStatus] = useState<BridgeStatus>(getStatus());
  useEffect(() => onStatus(setStatus), []);

  let label = "BRIDGE OFFLINE";
  if (status === "connecting") label = "BRIDGE…";
  else if (status === "connected") label = "BRIDGE";

  return (
    <span className="bridge-pill" data-status={status} title={`Bridge ${status}`}>
      <span className="dot" />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Wire BridgeStatus into Header**

Edit `src/panel/components/Header.tsx`. Add the import at the top:

```tsx
import BridgeStatusPill from "./BridgeStatus";
```

Place `<BridgeStatusPill />` immediately after the existing `.status-pill` JSX so the two pills sit side by side.

- [ ] **Step 3: Add the bridge-pill CSS**

Find the file that styles `.status-pill` (run `grep -l 'status-pill' src/panel/styles/`). Append:

```css
.bridge-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 2px;
  border: 1px solid var(--hairline);
  color: var(--text-tertiary);
}

.bridge-pill .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-tertiary);
}

.bridge-pill[data-status="connected"] {
  color: var(--text-primary);
}
.bridge-pill[data-status="connected"] .dot {
  background: var(--accent);
}

.bridge-pill[data-status="connecting"] .dot {
  background: var(--text-secondary);
  animation: bridge-pulse 1.2s ease-in-out infinite;
}

@keyframes bridge-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

If any token (e.g., `--accent`, `--hairline`) doesn't exist, substitute the closest existing token from `src/panel/styles/tokens.css`.

- [ ] **Step 4: Start the bridge client on App mount**

Edit `src/panel/App.tsx`. Add the import:

```tsx
import { startBridgeClient } from "./lib/bridge-client";
```

In the `App` component body, add a one-time effect (place it next to the other top-level effects):

```tsx
useEffect(() => {
  startBridgeClient();
}, []);
```

- [ ] **Step 5: Verify build + typecheck**

Run: `pnpm typecheck && pnpm build`
Expected: zero errors. The Chrome extension build should produce the panel bundle including the new component.

- [ ] **Step 6: Commit**

```bash
git add src/panel/components/BridgeStatus.tsx src/panel/components/Header.tsx src/panel/App.tsx src/panel/styles/
git commit -m "feat(panel): show bridge connection status pill"
```

---

### Task 6: Add CSS-side helpers for outbound pushes

**Files:**
- Create: `src/panel/lib/figma-mapping.ts`

- [ ] **Step 1: Implement push payload builder**

```ts
// src/panel/lib/figma-mapping.ts
import type { PushChangesMsg, TargetRef } from "@shared/bridge-messages";
import type { Edit } from "@shared/types";

export function buildPushFromEdit(edit: Edit): PushChangesMsg {
  return {
    type: "push-changes",
    from: "panel",
    target: targetRefForEdit(edit),
    changes: edit.changes,
  };
}

export function targetRefForEdit(edit: Edit): TargetRef {
  return {
    kind: "dom",
    id: edit.element.wranglerId,
    display: describeElement(edit),
  };
}

function describeElement(edit: Edit): string {
  const tag = edit.element.tag;
  const text = edit.element.text?.trim().slice(0, 24);
  const role = edit.element.role;
  if (text) return `<${tag}> "${text}"`;
  if (role) return `<${tag} role="${role}">`;
  return `<${tag}>`;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/panel/lib/figma-mapping.ts
git commit -m "feat(panel): build PushChangesMsg from an Edit"
```

---

### Task 7: Add bridge-aware actions to the edit store

**Files:**
- Modify: `src/panel/store/editStore.ts`

- [ ] **Step 1: Add the new action type signatures and implementations**

In `src/panel/store/editStore.ts`, add these imports near the top (alongside existing imports):

```ts
import type { PushChangesMsg } from "@shared/bridge-messages";
import { send as sendBridge } from "../lib/bridge-client";
import { buildPushFromEdit, targetRefForEdit } from "../lib/figma-mapping";
```

Extend the `EditState` interface:

```ts
otherSideTarget: { display: string; kind: "figma-node" } | null;
```

Extend the `EditActions` interface:

```ts
pushSelectedToFigma(): boolean;
applyFromFigma(msg: PushChangesMsg): Promise<void>;
setOtherSideTarget(target: { display: string; kind: "figma-node" } | null): void;
```

Add the initial state inside the `create` call:

```ts
otherSideTarget: null,
```

Add the action implementations:

```ts
setOtherSideTarget: (target) => set({ otherSideTarget: target }),

pushSelectedToFigma: () => {
  const id = get().selectedId;
  if (!id) return false;
  const edit = get().edits.find((e) => e.id === id);
  if (!edit || edit.changes.length === 0) return false;
  const msg = buildPushFromEdit(edit);
  return sendBridge(msg);
},

applyFromFigma: async (msg) => {
  const id = get().selectedId;
  if (!id) return;
  for (const change of msg.changes) {
    await get().applyChange({
      editId: id,
      state: change.state,
      breakpoint: change.breakpoint,
      property: change.property,
      value: change.to,
    });
  }
  set({
    otherSideTarget: { display: msg.target.display, kind: "figma-node" },
  });
},
```

The `applyFromFigma` implementation deliberately reuses the existing `applyChange` action so the content-script side stays unchanged.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/panel/store/editStore.ts
git commit -m "feat(panel): bridge push/apply actions on the edit store"
```

---

### Task 8: Wire incoming bridge messages into the store

**Files:**
- Modify: `src/panel/App.tsx`

- [ ] **Step 1: Subscribe to bridge messages on mount**

Add the import:

```tsx
import { onMessage as onBridgeMessage } from "./lib/bridge-client";
```

Add a new `useEffect` in `App.tsx` body:

```tsx
const applyFromFigma = useEditStore((s) => s.applyFromFigma);
const setOtherSideTarget = useEditStore((s) => s.setOtherSideTarget);

useEffect(() => {
  return onBridgeMessage((msg) => {
    if (msg.type === "push-changes" && msg.from === "figma") {
      void applyFromFigma(msg);
    } else if (msg.type === "echo" && msg.from === "figma") {
      setOtherSideTarget(
        msg.target ? { display: msg.target.display, kind: "figma-node" } : null,
      );
    }
  });
}, [applyFromFigma, setOtherSideTarget]);
```

- [ ] **Step 2: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/panel/App.tsx
git commit -m "feat(panel): apply inbound Figma changes via bridge"
```

---

### Task 9: Add the "Push to Figma" button + other-side echo display

**Files:**
- Create: `src/panel/components/PushToFigmaButton.tsx`
- Modify: `src/panel/components/EditCard.tsx` (add button)
- Modify: `src/panel/components/Header.tsx` (echo display)

- [ ] **Step 1: Implement the PushToFigmaButton component**

```tsx
// src/panel/components/PushToFigmaButton.tsx
import { useEffect, useState } from "react";
import { type BridgeStatus, getStatus, onStatus } from "../lib/bridge-client";
import { useEditStore } from "../store/editStore";

interface Props {
  editId: string;
}

export default function PushToFigmaButton({ editId }: Props) {
  const [status, setStatus] = useState<BridgeStatus>(getStatus());
  const [flash, setFlash] = useState<"sent" | "blocked" | null>(null);
  const pushSelectedToFigma = useEditStore((s) => s.pushSelectedToFigma);
  const selectedId = useEditStore((s) => s.selectedId);
  const edit = useEditStore((s) => s.edits.find((e) => e.id === editId));

  useEffect(() => onStatus(setStatus), []);

  const offline = status !== "connected";
  const empty = !edit || edit.changes.length === 0;
  const inactive = selectedId !== editId;
  const disabled = offline || empty || inactive;

  function handleClick() {
    const ok = pushSelectedToFigma();
    setFlash(ok ? "sent" : "blocked");
    window.setTimeout(() => setFlash(null), 1200);
  }

  let label = "Push to Figma";
  if (flash === "sent") label = "Pushed →";
  else if (flash === "blocked") label = "No bridge";
  else if (offline) label = "Bridge offline";

  return (
    <button
      type="button"
      className="push-to-figma"
      onClick={handleClick}
      disabled={disabled}
      data-flash={flash ?? undefined}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Slot the button into EditCard**

Open `src/panel/components/EditCard.tsx`. Find the existing footer / action row (where existing controls sit). Add the import:

```tsx
import PushToFigmaButton from "./PushToFigmaButton";
```

Render `<PushToFigmaButton editId={edit.id} />` inside the action row, next to the existing controls.

- [ ] **Step 3: Show the other-side target in Header**

In `src/panel/components/Header.tsx`, just above the URL row, add:

```tsx
const otherSide = useEditStore((s) => s.otherSideTarget);

{otherSide && (
  <div className="other-side-row">
    <span className="label">FIGMA</span>
    <span className="other-target" title={otherSide.display}>
      {otherSide.display}
    </span>
  </div>
)}
```

- [ ] **Step 4: Add minimal CSS for the new elements**

Append to the same panel CSS file used in Task 5:

```css
.push-to-figma {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  border: 1px solid var(--hairline);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-transform: uppercase;
}
.push-to-figma:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: var(--text-primary);
}
.push-to-figma:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.push-to-figma[data-flash="sent"] {
  border-color: var(--accent);
  color: var(--accent);
}

.other-side-row {
  display: flex;
  gap: 6px;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-secondary);
}
.other-side-row .other-target {
  color: var(--text-primary);
}
```

- [ ] **Step 5: Verify typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/panel/components/PushToFigmaButton.tsx src/panel/components/EditCard.tsx src/panel/components/Header.tsx src/panel/styles/
git commit -m "feat(panel): push-to-Figma button and Figma echo display"
```

---

### Task 10: Echo panel selection over the bridge

**Files:**
- Modify: `src/panel/store/editStore.ts`

- [ ] **Step 1: Send echo when the panel's selection changes**

Imports already in place from Task 7 (`sendBridge`, `targetRefForEdit`).

In `selectEdit`, replace the body:

```ts
selectEdit: (id) => {
  set({ selectedId: id });
  const edit = id ? get().edits.find((e) => e.id === id) : null;
  sendBridge({
    type: "echo",
    from: "panel",
    target: edit ? targetRefForEdit(edit) : null,
  });
},
```

In `receiveElement`, after the existing `set((s) => ({ … }))` call, add:

```ts
const justAdded = get().edits[get().edits.length - 1];
if (justAdded) {
  sendBridge({
    type: "echo",
    from: "panel",
    target: targetRefForEdit(justAdded),
  });
}
```

In `clearAll` and `removeEdit` (when removing the currently selected edit), after the existing logic, send a null echo:

```ts
sendBridge({ type: "echo", from: "panel", target: null });
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck`
Expected: zero errors. Sends silently no-op when the bridge isn't connected (Task 4's `send` returns false).

- [ ] **Step 3: Commit**

```bash
git add src/panel/store/editStore.ts
git commit -m "feat(panel): echo current selection over the bridge"
```

---

## Phase 3 — Figma plugin

These tasks are independent of Phase 2 once Phase 1 is done. Order within Phase 3 is sequential.

### Task 11: Scaffold the Figma plugin workspace

**Files:**
- Create: `figma-plugin/package.json`
- Create: `figma-plugin/tsconfig.json`
- Create: `figma-plugin/build.mjs`
- Modify: root `package.json` (add scripts + deps)

- [ ] **Step 1: Create `figma-plugin/package.json`**

```json
{
  "name": "@css-wrangler/figma-plugin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.mjs",
    "watch": "node build.mjs --watch"
  }
}
```

- [ ] **Step 2: Create `figma-plugin/tsconfig.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["@figma/plugin-typings"],
    "lib": ["ES2017", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  },
  "include": [
    "src/**/*",
    "../src/shared/bridge-messages.ts",
    "../src/shared/types.ts",
    "../src/shared/constants.ts"
  ]
}
```

- [ ] **Step 3: Add new dev deps to root `package.json`**

Add to `devDependencies`:

```json
"@figma/plugin-typings": "^1.106.0",
"esbuild": "^0.24.2"
```

Add to root `scripts`:

```json
"figma:build": "pnpm -C figma-plugin build",
"figma:watch": "pnpm -C figma-plugin watch",
"figma:typecheck": "tsc -p figma-plugin/tsconfig.json --noEmit"
```

- [ ] **Step 4: Create `figma-plugin/build.mjs`**

```js
// figma-plugin/build.mjs
import { build, context } from "esbuild";
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");
const outdir = resolve(__dirname, "dist");
mkdirSync(outdir, { recursive: true });

const codeOpts = {
  entryPoints: [resolve(__dirname, "src/code.ts")],
  outfile: resolve(outdir, "code.js"),
  bundle: true,
  format: "iife",
  target: "es2017",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
};

const uiOpts = {
  entryPoints: [resolve(__dirname, "src/ui.tsx")],
  outfile: resolve(outdir, "ui.js"),
  bundle: true,
  format: "iife",
  target: "es2017",
  platform: "browser",
  jsx: "automatic",
  loader: { ".css": "text" },
  define: { "process.env.NODE_ENV": '"production"' },
};

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #111; color: #eee; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="ui.js"></script>
  </body>
</html>`;

async function buildOnce() {
  await Promise.all([build(codeOpts), build(uiOpts)]);
  writeFileSync(resolve(outdir, "ui.html"), HTML);
  if (existsSync(resolve(__dirname, "manifest.json"))) {
    copyFileSync(resolve(__dirname, "manifest.json"), resolve(outdir, "manifest.json"));
  }
  console.log("[figma-plugin] built ->", outdir);
}

if (watch) {
  const ctxs = await Promise.all([context(codeOpts), context(uiOpts)]);
  await Promise.all(ctxs.map((c) => c.watch()));
  writeFileSync(resolve(outdir, "ui.html"), HTML);
  console.log("[figma-plugin] watching…");
} else {
  await buildOnce();
}
```

- [ ] **Step 5: Install + initial build smoke**

```bash
pnpm install
mkdir -p figma-plugin/src
echo 'export {};' > figma-plugin/src/code.ts
echo 'export {};' > figma-plugin/src/ui.tsx
pnpm figma:build
```

Expected: `figma-plugin/dist/code.js`, `figma-plugin/dist/ui.js`, `figma-plugin/dist/ui.html` exist.

- [ ] **Step 6: Commit**

```bash
git add figma-plugin/ package.json pnpm-lock.yaml
git commit -m "feat(figma-plugin): scaffold workspace with esbuild"
```

---

### Task 12: Add the Figma plugin manifest

**Files:**
- Create: `figma-plugin/manifest.json`

- [ ] **Step 1: Write the manifest**

```json
{
  "name": "CSS Wrangler Bridge",
  "id": "css-wrangler-bridge",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["ws://localhost:9123"],
    "reasoning": "Local WebSocket bridge for syncing CSS edits between this plugin and the CSS Wrangler Chrome extension."
  }
}
```

- [ ] **Step 2: Re-run the build to copy manifest into `dist/`**

```bash
pnpm figma:build
```

Expected: `figma-plugin/dist/manifest.json` matches the source.

- [ ] **Step 3: Commit**

```bash
git add figma-plugin/manifest.json
git commit -m "feat(figma-plugin): add plugin manifest with network allowlist"
```

---

### Task 13: Implement the Figma plugin bridge client

**Files:**
- Create: `figma-plugin/src/bridge-client.ts`

- [ ] **Step 1: Implement (mirror of panel's, with `client: "figma"`)**

```ts
// figma-plugin/src/bridge-client.ts
import {
  BRIDGE_PROTOCOL_VERSION,
  DEFAULT_BRIDGE_URL,
  type BridgeMessage,
  type HelloMsg,
} from "../../src/shared/bridge-messages";

export type BridgeStatus = "offline" | "connecting" | "connected";

type Listener = (msg: BridgeMessage) => void;
type StatusListener = (status: BridgeStatus) => void;

let socket: WebSocket | null = null;
let status: BridgeStatus = "offline";
let backoffMs = 2000;
let reconnectTimer: number | null = null;
const listeners = new Set<Listener>();
const statusListeners = new Set<StatusListener>();

const HELLO: HelloMsg = {
  type: "hello",
  client: "figma",
  version: BRIDGE_PROTOCOL_VERSION,
};

export function startBridgeClient(): void {
  if (socket) return;
  setStatus("connecting");
  let next: WebSocket;
  try {
    next = new WebSocket(DEFAULT_BRIDGE_URL);
  } catch {
    scheduleReconnect();
    return;
  }
  socket = next;
  next.addEventListener("open", () => {
    backoffMs = 2000;
    setStatus("connected");
    next.send(JSON.stringify(HELLO));
  });
  next.addEventListener("message", (ev) => {
    let msg: BridgeMessage;
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : "") as BridgeMessage;
    } catch {
      return;
    }
    for (const l of listeners) l(msg);
  });
  next.addEventListener("close", () => {
    if (socket === next) socket = null;
    scheduleReconnect();
  });
  next.addEventListener("error", () => {
    next.close();
  });
}

function scheduleReconnect(): void {
  if (reconnectTimer != null) return;
  setStatus("offline");
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    backoffMs = Math.min(backoffMs * 2, 8000);
    startBridgeClient();
  }, backoffMs);
}

function setStatus(next: BridgeStatus): void {
  if (status === next) return;
  status = next;
  for (const l of statusListeners) l(status);
}

export function send(msg: BridgeMessage): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(msg));
  return true;
}

export function onMessage(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function onStatus(fn: StatusListener): () => void {
  statusListeners.add(fn);
  fn(status);
  return () => {
    statusListeners.delete(fn);
  };
}

export function getStatus(): BridgeStatus {
  return status;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm figma:typecheck`
Expected: zero errors. (`WebSocket` is browser-typed, fine inside the iframe.)

- [ ] **Step 3: Commit**

```bash
git add figma-plugin/src/bridge-client.ts
git commit -m "feat(figma-plugin): typed bridge WebSocket client"
```

---

### Task 14: Implement Figma → CSS property mapping

**Files:**
- Create: `figma-plugin/src/mapping.ts`

- [ ] **Step 1: Implement the mapping function**

```ts
// figma-plugin/src/mapping.ts
import type { PropertyChange } from "../../src/shared/types";

export interface ReadResult {
  changes: PropertyChange[];
  unsupported: string[];
}

const DEFAULTS = { state: "default" as const, breakpoint: "desktop" as const, tailwindHint: null };

export function readNodeProperties(node: SceneNode): ReadResult {
  const changes: PropertyChange[] = [];
  const unsupported: string[] = [];

  if ("fills" in node && Array.isArray(node.fills)) {
    const fill = node.fills[0];
    if (fill && fill.type === "SOLID") {
      changes.push({
        ...DEFAULTS,
        property: node.type === "TEXT" ? "color" : "background-color",
        from: "",
        to: cssColorFromSolid(fill),
      });
    } else if (fill && fill.type !== "SOLID") {
      unsupported.push(`${fill.type.toLowerCase()} fill`);
    }
  }

  if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
    changes.push({
      ...DEFAULTS,
      property: "border-radius",
      from: "",
      to: `${node.cornerRadius}px`,
    });
  }

  if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke && stroke.type === "SOLID") {
      changes.push({
        ...DEFAULTS,
        property: "border-color",
        from: "",
        to: cssColorFromSolid(stroke),
      });
    }
    if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
      changes.push({
        ...DEFAULTS,
        property: "border-width",
        from: "",
        to: `${node.strokeWeight}px`,
      });
    }
  }

  if ("paddingTop" in node) {
    const map: Array<["paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft", "padding-top" | "padding-right" | "padding-bottom" | "padding-left"]> = [
      ["paddingTop", "padding-top"],
      ["paddingRight", "padding-right"],
      ["paddingBottom", "padding-bottom"],
      ["paddingLeft", "padding-left"],
    ];
    for (const [key, prop] of map) {
      const v = (node as unknown as Record<string, number>)[key];
      if (typeof v === "number") {
        changes.push({ ...DEFAULTS, property: prop, from: "", to: `${v}px` });
      }
    }
  }

  if ("itemSpacing" in node && typeof node.itemSpacing === "number") {
    changes.push({ ...DEFAULTS, property: "gap", from: "", to: `${node.itemSpacing}px` });
  }

  if (node.type === "TEXT") {
    if (typeof node.fontSize === "number") {
      changes.push({ ...DEFAULTS, property: "font-size", from: "", to: `${node.fontSize}px` });
    }
    if (typeof node.lineHeight === "object" && "value" in node.lineHeight) {
      const lh = node.lineHeight as { value: number; unit: "PIXELS" | "PERCENT" };
      changes.push({
        ...DEFAULTS,
        property: "line-height",
        from: "",
        to: lh.unit === "PIXELS" ? `${lh.value}px` : `${(lh.value / 100).toFixed(2)}`,
      });
    }
    if (typeof node.letterSpacing === "object" && "value" in node.letterSpacing) {
      const ls = node.letterSpacing as { value: number; unit: "PIXELS" | "PERCENT" };
      changes.push({
        ...DEFAULTS,
        property: "letter-spacing",
        from: "",
        to: ls.unit === "PIXELS" ? `${ls.value}px` : `${(ls.value / 100).toFixed(3)}em`,
      });
    }
    if (node.fontWeight && typeof node.fontWeight === "number") {
      changes.push({ ...DEFAULTS, property: "font-weight", from: "", to: `${node.fontWeight}` });
    }
  }

  if ("layoutSizingHorizontal" in node && (node as unknown as { layoutSizingHorizontal: string }).layoutSizingHorizontal === "FIXED") {
    changes.push({ ...DEFAULTS, property: "width", from: "", to: `${node.width}px` });
  }
  if ("layoutSizingVertical" in node && (node as unknown as { layoutSizingVertical: string }).layoutSizingVertical === "FIXED") {
    changes.push({ ...DEFAULTS, property: "height", from: "", to: `${node.height}px` });
  }

  return { changes, unsupported };
}

function cssColorFromSolid(p: SolidPaint): string {
  const r = Math.round(p.color.r * 255);
  const g = Math.round(p.color.g * 255);
  const b = Math.round(p.color.b * 255);
  const a = p.opacity ?? 1;
  if (a === 1) {
    const hex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm figma:typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add figma-plugin/src/mapping.ts
git commit -m "feat(figma-plugin): map Figma node properties to PropertyChange[]"
```

---

### Task 15: Implement CSS → Figma application

**Files:**
- Create: `figma-plugin/src/apply.ts`

- [ ] **Step 1: Implement the apply function**

```ts
// figma-plugin/src/apply.ts
import type { PropertyChange } from "../../src/shared/types";

export interface ApplyResult {
  appliedCount: number;
  warnings: string[];
}

export async function applyChangesToNode(
  node: SceneNode,
  changes: PropertyChange[],
): Promise<ApplyResult> {
  const warnings: string[] = [];
  let applied = 0;

  for (const change of changes) {
    if (change.state !== "default" || change.breakpoint !== "desktop") {
      warnings.push(`skipped ${change.property} (state/breakpoint not supported in Figma)`);
      continue;
    }
    try {
      const did = await applyOne(node, change);
      if (did) applied++;
      else warnings.push(`unsupported on this node: ${change.property}`);
    } catch (err) {
      warnings.push(`apply ${change.property} failed: ${(err as Error).message}`);
    }
  }
  return { appliedCount: applied, warnings };
}

async function applyOne(node: SceneNode, change: PropertyChange): Promise<boolean> {
  switch (change.property) {
    case "background-color":
    case "color": {
      if (!("fills" in node)) return false;
      const color = parseCssColor(change.to);
      if (!color) return false;
      node.fills = [{ type: "SOLID", color: color.rgb, opacity: color.a }];
      return true;
    }
    case "border-radius": {
      if (!("cornerRadius" in node)) return false;
      node.cornerRadius = parsePx(change.to);
      return true;
    }
    case "border-width": {
      if (!("strokeWeight" in node)) return false;
      node.strokeWeight = parsePx(change.to);
      return true;
    }
    case "border-color": {
      if (!("strokes" in node)) return false;
      const color = parseCssColor(change.to);
      if (!color) return false;
      node.strokes = [{ type: "SOLID", color: color.rgb, opacity: color.a }];
      return true;
    }
    case "padding-top":
    case "padding-right":
    case "padding-bottom":
    case "padding-left": {
      const figmaKey = camel(change.property);
      if (!(figmaKey in node)) return false;
      (node as unknown as Record<string, number>)[figmaKey] = parsePx(change.to);
      return true;
    }
    case "gap": {
      if (!("itemSpacing" in node)) return false;
      node.itemSpacing = parsePx(change.to);
      return true;
    }
    case "font-size":
    case "font-weight":
    case "line-height":
    case "letter-spacing": {
      if (node.type !== "TEXT") return false;
      const font = node.fontName;
      if (typeof font === "symbol") return false;
      await figma.loadFontAsync(font);
      switch (change.property) {
        case "font-size":
          node.fontSize = parsePx(change.to);
          return true;
        case "font-weight":
          // Changing font-weight requires loading a different font style; best-effort skip in v0.
          return false;
        case "line-height":
          node.lineHeight = parseLineHeight(change.to);
          return true;
        case "letter-spacing":
          node.letterSpacing = parseLetterSpacing(change.to);
          return true;
      }
      return false;
    }
    case "width": {
      if (!("resize" in node)) return false;
      (node as unknown as { resize: (w: number, h: number) => void }).resize(
        parsePx(change.to),
        node.height,
      );
      return true;
    }
    case "height": {
      if (!("resize" in node)) return false;
      (node as unknown as { resize: (w: number, h: number) => void }).resize(
        node.width,
        parsePx(change.to),
      );
      return true;
    }
    default:
      return false;
  }
}

function camel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

function parsePx(value: string): number {
  const m = /^(-?\d+(?:\.\d+)?)/.exec(value.trim());
  return m && m[1] ? Number(m[1]) : 0;
}

function parseLineHeight(value: string): LineHeight {
  const v = value.trim();
  if (v.endsWith("px")) return { unit: "PIXELS", value: parsePx(v) };
  return { unit: "PERCENT", value: Number(v) * 100 };
}

function parseLetterSpacing(value: string): LetterSpacing {
  const v = value.trim();
  if (v.endsWith("em")) return { unit: "PERCENT", value: Number(v.slice(0, -2)) * 100 };
  return { unit: "PIXELS", value: parsePx(v) };
}

function parseCssColor(value: string): { rgb: RGB; a: number } | null {
  const v = value.trim();
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v);
  if (hex && hex[1]) {
    const n = Number.parseInt(hex[1], 16);
    return {
      rgb: { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 },
      a: hex[2] ? Number.parseInt(hex[2], 16) / 255 : 1,
    };
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(v);
  if (rgba && rgba[1] && rgba[2] && rgba[3]) {
    return {
      rgb: {
        r: Number(rgba[1]) / 255,
        g: Number(rgba[2]) / 255,
        b: Number(rgba[3]) / 255,
      },
      a: rgba[4] !== undefined ? Number(rgba[4]) : 1,
    };
  }
  return null;
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm figma:typecheck`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add figma-plugin/src/apply.ts
git commit -m "feat(figma-plugin): apply PropertyChange[] to Figma nodes"
```

---

### Task 16: Implement the Figma plugin sandbox (`code.ts`)

**Files:**
- Create: `figma-plugin/src/code.ts`

- [ ] **Step 1: Implement the sandbox bridge between Figma API and the iframe UI**

```ts
// figma-plugin/src/code.ts
import { applyChangesToNode } from "./apply";
import { readNodeProperties } from "./mapping";
import type { PropertyChange } from "../../src/shared/types";

figma.showUI(__html__, { width: 360, height: 480, title: "CSS Wrangler Bridge" });

interface NodeInfo {
  id: string;
  name: string;
  type: SceneNode["type"];
}

interface SelectionMessage {
  type: "selection";
  node: NodeInfo | null;
  changes?: PropertyChange[];
  unsupported?: string[];
}

function emitSelection(): void {
  const node = figma.currentPage.selection[0];
  if (!node) {
    const msg: SelectionMessage = { type: "selection", node: null };
    figma.ui.postMessage(msg);
    return;
  }
  const { changes, unsupported } = readNodeProperties(node);
  const msg: SelectionMessage = {
    type: "selection",
    node: { id: node.id, name: node.name, type: node.type },
    changes,
    unsupported,
  };
  figma.ui.postMessage(msg);
}

emitSelection();
figma.on("selectionchange", emitSelection);

interface ApplyFromBrowserMsg {
  type: "apply-from-browser";
  changes: PropertyChange[];
  display: string;
}

interface ApplyResultMsg {
  type: "apply-result";
  ok: boolean;
  reason?: string;
  appliedCount?: number;
  warnings?: string[];
  target?: NodeInfo;
}

figma.ui.onmessage = async (raw: unknown) => {
  if (!raw || typeof raw !== "object") return;
  const msg = raw as { type: string };
  if (msg.type === "apply-from-browser") {
    const m = raw as ApplyFromBrowserMsg;
    const node = figma.currentPage.selection[0];
    if (!node) {
      const out: ApplyResultMsg = { type: "apply-result", ok: false, reason: "no-target" };
      figma.ui.postMessage(out);
      return;
    }
    const result = await applyChangesToNode(node, m.changes);
    figma.commitUndo();
    const out: ApplyResultMsg = {
      type: "apply-result",
      ok: true,
      target: { id: node.id, name: node.name, type: node.type },
      appliedCount: result.appliedCount,
      warnings: result.warnings,
    };
    figma.ui.postMessage(out);
  }
};
```

- [ ] **Step 2: Verify typecheck + build**

Run: `pnpm figma:typecheck && pnpm figma:build`
Expected: zero errors. `figma-plugin/dist/code.js` rebuilt.

- [ ] **Step 3: Commit**

```bash
git add figma-plugin/src/code.ts
git commit -m "feat(figma-plugin): sandbox plugin code with selection + apply handlers"
```

---

### Task 17: Implement the Figma plugin UI (`ui.tsx`)

**Files:**
- Create: `figma-plugin/src/ui.tsx`

- [ ] **Step 1: Confirm React is available to esbuild**

React is already a root dependency. esbuild's `moduleResolution: "bundler"` in the figma-plugin tsconfig + the root `node_modules` resolution path means `import { useState } from "react"` works without re-adding deps.

- [ ] **Step 2: Implement the UI**

```tsx
// figma-plugin/src/ui.tsx
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type BridgeStatus,
  getStatus,
  onMessage as onBridgeMessage,
  onStatus,
  send as sendBridge,
  startBridgeClient,
} from "./bridge-client";
import type { PropertyChange } from "../../src/shared/types";
import type { TargetRef } from "../../src/shared/bridge-messages";

interface NodeInfo {
  id: string;
  name: string;
  type: string;
}

interface SelectionState {
  node: NodeInfo | null;
  changes: PropertyChange[];
  unsupported: string[];
}

const EMPTY: SelectionState = { node: null, changes: [], unsupported: [] };

function postToSandbox(msg: object): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

function App() {
  const [bridge, setBridge] = useState<BridgeStatus>(getStatus());
  const [selection, setSelection] = useState<SelectionState>(EMPTY);
  const [otherTarget, setOtherTarget] = useState<TargetRef | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    startBridgeClient();
    return onStatus(setBridge);
  }, []);

  useEffect(() => {
    return onBridgeMessage((msg) => {
      if (msg.type === "echo" && msg.from === "panel") {
        setOtherTarget(msg.target);
      } else if (msg.type === "push-changes" && msg.from === "panel") {
        postToSandbox({ type: "apply-from-browser", changes: msg.changes, display: msg.target.display });
      }
    });
  }, []);

  useEffect(() => {
    function onSandbox(ev: MessageEvent) {
      const data = ev.data?.pluginMessage;
      if (!data || typeof data !== "object") return;
      if (data.type === "selection") {
        setSelection({
          node: data.node ?? null,
          changes: data.changes ?? [],
          unsupported: data.unsupported ?? [],
        });
        sendBridge({
          type: "echo",
          from: "figma",
          target: data.node
            ? { kind: "figma-node", id: data.node.id, display: targetDisplay(data.node) }
            : null,
        });
      } else if (data.type === "apply-result") {
        setFlash(data.ok ? `Applied ${data.appliedCount ?? 0}` : `Skipped: ${data.reason}`);
        window.setTimeout(() => setFlash(null), 1500);
      }
    }
    window.addEventListener("message", onSandbox);
    return () => window.removeEventListener("message", onSandbox);
  }, []);

  function pushToBrowser() {
    if (!selection.node || selection.changes.length === 0) {
      setFlash("Nothing to push");
      window.setTimeout(() => setFlash(null), 1500);
      return;
    }
    const ok = sendBridge({
      type: "push-changes",
      from: "figma",
      target: { kind: "figma-node", id: selection.node.id, display: targetDisplay(selection.node) },
      changes: selection.changes,
    });
    setFlash(ok ? "Pushed →" : "Bridge offline");
    window.setTimeout(() => setFlash(null), 1500);
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span style={styles.brand}>CSS Wrangler Bridge</span>
        <span style={{ ...styles.pill, ...statusPill(bridge) }}>BRIDGE {bridge.toUpperCase()}</span>
      </header>

      <section style={styles.section}>
        <div style={styles.label}>FIGMA TARGET</div>
        <div style={styles.target}>
          {selection.node ? `${selection.node.type.toLowerCase()} "${selection.node.name}"` : "— nothing selected —"}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.label}>BROWSER TARGET</div>
        <div style={styles.target}>
          {otherTarget ? otherTarget.display : "— nothing picked —"}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.label}>READY TO PUSH ({selection.changes.length})</div>
        {selection.changes.length === 0 ? (
          <div style={styles.empty}>No supported properties on this node.</div>
        ) : (
          <ul style={styles.list}>
            {selection.changes.map((c) => (
              <li key={c.property} style={styles.row}>
                <span>{c.property}</span>
                <span style={styles.value}>{c.to}</span>
              </li>
            ))}
          </ul>
        )}
        {selection.unsupported.length > 0 && (
          <div style={styles.unsupported}>
            Skipped: {selection.unsupported.join(", ")}
          </div>
        )}
      </section>

      <footer style={styles.footer}>
        <button
          type="button"
          onClick={pushToBrowser}
          disabled={bridge !== "connected" || !selection.node || selection.changes.length === 0}
          style={styles.pushButton}
        >
          {flash ?? "Push to browser →"}
        </button>
      </footer>
    </div>
  );
}

function targetDisplay(node: NodeInfo): string {
  return `${node.type.toLowerCase()} "${node.name.slice(0, 24)}"`;
}

function statusPill(s: BridgeStatus): { color: string; borderColor: string } {
  if (s === "connected") return { color: "#9ec79e", borderColor: "#9ec79e" };
  if (s === "connecting") return { color: "#c4a484", borderColor: "#c4a484" };
  return { color: "#888", borderColor: "#444" };
}

const styles: Record<string, React.CSSProperties> = {
  app: { display: "flex", flexDirection: "column", height: "100vh", background: "#111", color: "#eee", fontSize: 12, fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #222" },
  brand: { fontWeight: 600, letterSpacing: 0.4 },
  pill: { fontSize: 9, letterSpacing: 1, padding: "2px 8px", border: "1px solid", borderRadius: 2 },
  section: { padding: "12px 14px", borderBottom: "1px solid #1a1a1a" },
  label: { fontSize: 9, letterSpacing: 1.2, color: "#7a7a7a", marginBottom: 4 },
  target: { fontFamily: "ui-monospace, monospace", color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  empty: { color: "#666", fontStyle: "italic" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 },
  row: { display: "flex", justifyContent: "space-between", fontFamily: "ui-monospace, monospace", color: "#ccc" },
  value: { color: "#c4a484" },
  unsupported: { marginTop: 8, fontSize: 10, color: "#a06060" },
  footer: { marginTop: "auto", padding: 14, borderTop: "1px solid #222" },
  pushButton: { width: "100%", padding: "10px 14px", background: "#222", color: "#eee", border: "1px solid #333", cursor: "pointer", letterSpacing: 0.5, fontFamily: "inherit", fontSize: 12 },
};

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
```

- [ ] **Step 3: Build and verify**

Run: `pnpm figma:typecheck && pnpm figma:build`
Expected: zero errors. `figma-plugin/dist/ui.js` includes React.

- [ ] **Step 4: Commit**

```bash
git add figma-plugin/src/ui.tsx
git commit -m "feat(figma-plugin): React UI for selection, push, and echo"
```

---

## Phase 4 — Integration & polish

### Task 18: End-to-end manual smoke test (documented checklist)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add the Bridge / Figma plugin section to README**

Append a new top-level section to `README.md`:

````markdown
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
````

- [ ] **Step 2: Run the full checklist locally**

The checklist above doubles as the verification plan. Walk through it.
**Mark this step "verified at compile time only — runtime needs human verification" if you cannot run Chrome and Figma in this session.**

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add Figma plugin bridge setup guide"
```

---

### Task 19: Update CLAUDE.md to document the bridge as a fourth runtime context

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the bridge to the architecture table**

In `CLAUDE.md`, find the "Three runtime contexts" section heading and:

1. Rename it to **"Four runtime contexts (architecture map)"**.
2. Add a fourth row to the table:

```markdown
| **Bridge daemon** | `bridge/src/cli.ts` | WebSocket relay between Figma plugin and panel | Localhost only. Dumb relay — no CSS state, no pairings. Reads `WRANGLER_BRIDGE_PORT` env var. |
```

- [ ] **Step 2: Add new bullets to "The non-obvious invariants"**

After the existing invariants list, append:

```markdown
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
```

- [ ] **Step 3: Add a section under "How to add common things"**

Append:

````markdown
### A new property to the Figma ↔ CSS round-trip

1. Add the read in `figma-plugin/src/mapping.ts` (Figma → `PropertyChange`).
2. Add the apply in `figma-plugin/src/apply.ts` (`PropertyChange` → Figma node).
3. Property must already exist in `TIER_1_PROPERTIES`. If it doesn't,
   add it there first (see "A new editable property" above).
4. Manually verify the round-trip on a real Figma file + real page.
````

- [ ] **Step 4: Add a build/dev workflow note**

In the "Build & reload workflow" section, append:

````markdown

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
````

- [ ] **Step 5: Skim and verify the file still parses cleanly**

Open `CLAUDE.md`. No broken markdown. No duplicate section headings.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(CLAUDE): document bridge daemon and Figma plugin context"
```

---

### Task 20: Final integration verification

**Files:** (None — verification only)

- [ ] **Step 1: Full clean build**

Run, in order:

```bash
pnpm install
pnpm typecheck
pnpm bridge:typecheck
pnpm figma:typecheck
pnpm lint
pnpm build
pnpm figma:build
```

Expected: all clean, both `dist/` and `figma-plugin/dist/` present.

- [ ] **Step 2: Run the README e2e checklist**

Walk through every step in the **Figma Plugin Bridge** section of
`README.md`. Note any deviations from expected behavior.

If running this in a Claude session that cannot launch Chrome or Figma,
mark this step **"verified at compile time only — runtime needs human verification"** and stop here.

- [ ] **Step 3: Confirm existing flows still work**

- Pick → edit → copy patch → patch JSON validates against the v1.0
  schema (`src/shared/types.ts:Patch`).
- Clear-all wipes the page.
- Sibling-group apply still works (Tier 2 regression check).
- Force-state preview still works.

- [ ] **Step 4: Review what landed; do not push or PR**

```bash
git log --oneline figma-bridge..HEAD
```

If e2e found issues, fix and commit. Otherwise leave the push/PR
decision to the human after they validate in their environment.

---

## Out of scope (do not implement in this plan)

These are documented in the spec; reproducing here so they aren't
accidentally added during implementation:

- MCP server for Claude
- Persistent element ↔ node pairing
- Token / variable sync
- Effects, gradients, transforms, transitions, mixed-value selections
- Live-sync (auto-push on every value change)
- Multi-page Figma traversal
- Cloud relay / multi-user
- Automated test suite (CLAUDE.md flags this as out of scope project-wide)

