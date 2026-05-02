type Listener = (el: Element) => void;

const OVERLAY_ID = "__wrangler-overlay";
const HIGHLIGHT_ID = "__wrangler-highlight";
const TOOLTIP_ID = "__wrangler-tooltip";
const PICKER_STYLE_ID = "__wrangler-picker-style";

let active = false;
let onPickCb: Listener | null = null;
let onCancelCb: (() => void) | null = null;
let currentTarget: Element | null = null;

function ensurePickerStyles() {
  if (document.getElementById(PICKER_STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = PICKER_STYLE_ID;
  s.textContent = `
#${OVERLAY_ID} {
  position: fixed; inset: 0; z-index: 2147483646;
  cursor: crosshair !important;
  background: transparent;
  pointer-events: auto;
}
#${OVERLAY_ID} * { cursor: crosshair !important; }
#${HIGHLIGHT_ID} {
  position: fixed; pointer-events: none; z-index: 2147483647;
  outline: 2px solid #FF3D00; outline-offset: -2px;
  background: rgba(255, 61, 0, 0.06);
  transition: top 60ms linear, left 60ms linear, width 60ms linear, height 60ms linear;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
#${TOOLTIP_ID} {
  position: fixed; pointer-events: none; z-index: 2147483647;
  background: #0E0E10; color: #FAFAF7;
  font: 11px/1.2 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.04em; text-transform: uppercase;
  padding: 4px 6px; border: 1px solid #FF3D00;
  white-space: nowrap;
}
`;
  document.head.appendChild(s);
}

function highlight(el: Element | null) {
  let hl = document.getElementById(HIGHLIGHT_ID) as HTMLDivElement | null;
  let tip = document.getElementById(TOOLTIP_ID) as HTMLDivElement | null;
  if (!el) {
    hl?.remove();
    tip?.remove();
    return;
  }
  if (!hl) {
    hl = document.createElement("div");
    hl.id = HIGHLIGHT_ID;
    document.documentElement.appendChild(hl);
  }
  if (!tip) {
    tip = document.createElement("div");
    tip.id = TOOLTIP_ID;
    document.documentElement.appendChild(tip);
  }
  const r = el.getBoundingClientRect();
  hl.style.top = `${r.top}px`;
  hl.style.left = `${r.left}px`;
  hl.style.width = `${r.width}px`;
  hl.style.height = `${r.height}px`;
  const tag = el.tagName.toLowerCase();
  const cls = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).slice(0, 2).join(".");
  tip.textContent = `${tag}${cls ? `.${cls}` : ""}  ${Math.round(r.width)}×${Math.round(r.height)}`;
  tip.style.top = `${Math.max(0, r.top - 22)}px`;
  tip.style.left = `${r.left}px`;
}

function getOverlayTarget(e: MouseEvent): Element | null {
  // hide overlay momentarily so elementFromPoint sees through
  const overlay = document.getElementById(OVERLAY_ID);
  const display = overlay?.style.display;
  if (overlay) overlay.style.display = "none";
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (overlay) overlay.style.display = display ?? "";
  if (!el) return null;
  if (
    el.id === HIGHLIGHT_ID ||
    el.id === TOOLTIP_ID ||
    el.id === OVERLAY_ID ||
    el.tagName === "HTML" ||
    el.tagName === "BODY"
  ) {
    return null;
  }
  return el;
}

function onMove(e: MouseEvent) {
  const el = getOverlayTarget(e);
  currentTarget = el;
  highlight(el);
}

function onClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  const el = currentTarget ?? getOverlayTarget(e);
  if (el) commit(el);
}

function onKey(e: KeyboardEvent) {
  if (!active) return;
  if (e.key === "Escape") {
    e.preventDefault();
    cancel();
    return;
  }
  if (e.key === "Enter" && currentTarget) {
    e.preventDefault();
    commit(currentTarget);
    return;
  }
  if (e.key === "ArrowUp" && currentTarget?.parentElement) {
    e.preventDefault();
    currentTarget = currentTarget.parentElement;
    highlight(currentTarget);
  }
  if (e.key === "ArrowDown" && currentTarget?.firstElementChild) {
    e.preventDefault();
    currentTarget = currentTarget.firstElementChild;
    highlight(currentTarget);
  }
}

function commit(el: Element) {
  const cb = onPickCb;
  cleanup();
  cb?.(el);
}

function cancel() {
  const cb = onCancelCb;
  cleanup();
  cb?.();
}

function cleanup() {
  active = false;
  currentTarget = null;
  document.getElementById(OVERLAY_ID)?.remove();
  highlight(null);
  document.removeEventListener("keydown", onKey, true);
}

export function startPick(onPick: Listener, onCancel: () => void): void {
  if (active) return;
  active = true;
  onPickCb = onPick;
  onCancelCb = onCancel;
  ensurePickerStyles();

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.addEventListener("mousemove", onMove);
  overlay.addEventListener("click", onClick, { capture: true });
  document.documentElement.appendChild(overlay);
  document.addEventListener("keydown", onKey, true);
}

export function stopPick(): void {
  if (!active) return;
  cancel();
}
