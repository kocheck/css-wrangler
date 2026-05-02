import type { BreakpointKey, CssState, TierProperty } from "@shared/constants";
import {
  BREAKPOINTS,
  FORCE_FOCUS_CLASS,
  FORCE_HOVER_CLASS,
  STYLE_TAG_ID,
  WRANGLER_CLASS_PREFIX,
} from "@shared/constants";

interface RuleKey {
  wranglerId: string;
  state: CssState;
  breakpoint: BreakpointKey;
  property: TierProperty;
}

type RuleStore = Map<string, { key: RuleKey; value: string }>;

const rules: RuleStore = new Map();

function ruleKeyId(k: RuleKey): string {
  return `${k.wranglerId}|${k.state}|${k.breakpoint}|${k.property}`;
}

function selectorFor(wranglerId: string, state: CssState): string {
  const base = `.${wranglerId}`;
  switch (state) {
    case "default":
      return base;
    case "hover":
      // sibling-class trick: real :hover plus the force-hover class
      return `${base}:hover, ${base}.${FORCE_HOVER_CLASS}`;
    case "focus":
      return `${base}:focus-visible, ${base}.${FORCE_FOCUS_CLASS}`;
  }
}

function ensureStyleTag(): HTMLStyleElement {
  let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = STYLE_TAG_ID;
    tag.setAttribute("data-wrangler", "true");
    document.head.appendChild(tag);
  } else if (tag.parentElement !== document.head || document.head.lastElementChild !== tag) {
    // re-append at the end of <head> to win source-order ties
    document.head.appendChild(tag);
  }
  return tag;
}

export function reattachStyleTag(): void {
  // re-append at the end of <head> if it has been removed or moved
  const tag = document.getElementById(STYLE_TAG_ID);
  if (!tag) {
    rebuildStyleTag();
    return;
  }
  if (document.head.lastElementChild !== tag) document.head.appendChild(tag);
}

export function rebuildStyleTag(): void {
  const tag = ensureStyleTag();
  const byBreakpoint: Record<BreakpointKey, string[]> = {
    mobile: [],
    tablet: [],
    desktop: [],
  };

  // group default-breakpoint rules outside @media
  const defaultBreakpoint: string[] = [];

  for (const { key, value } of rules.values()) {
    const sel = selectorFor(key.wranglerId, key.state);
    const decl = `${sel} { ${key.property}: ${value} !important; }`;
    if (key.breakpoint === "desktop") {
      defaultBreakpoint.push(decl);
    } else {
      byBreakpoint[key.breakpoint].push(decl);
    }
  }

  const chunks: string[] = [
    "/* css-wrangler — injected styles. Wiped on Clear-all or reload. */",
    ...defaultBreakpoint,
  ];

  for (const bp of ["tablet", "mobile"] as const) {
    if (byBreakpoint[bp].length === 0) continue;
    chunks.push(`@media (max-width: ${BREAKPOINTS[bp]}px) {`);
    chunks.push(...byBreakpoint[bp].map((r) => `  ${r}`));
    chunks.push("}");
  }

  tag.textContent = chunks.join("\n");
}

export function applyRule(key: RuleKey, value: string): void {
  rules.set(ruleKeyId(key), { key, value });
  rebuildStyleTag();
}

export function removeAllRulesFor(wranglerId: string): void {
  for (const id of Array.from(rules.keys())) {
    if (id.startsWith(`${wranglerId}|`)) rules.delete(id);
  }
  rebuildStyleTag();
}

export function clearAllInjected(): void {
  rules.clear();
  const tag = document.getElementById(STYLE_TAG_ID);
  tag?.remove();
  for (const el of document.querySelectorAll(`[class*="${WRANGLER_CLASS_PREFIX}"]`)) {
    for (const cls of Array.from(el.classList)) {
      if (cls.startsWith(WRANGLER_CLASS_PREFIX)) el.classList.remove(cls);
    }
    el.classList.remove(FORCE_HOVER_CLASS, FORCE_FOCUS_CLASS);
  }
}

export function tagElement(el: Element, wranglerId: string): void {
  el.classList.add(wranglerId);
}

export function findElementByWranglerId(wranglerId: string): Element | null {
  return document.querySelector(`.${CSS.escape(wranglerId)}`);
}

export function reapplyClassesFromMap(map: Map<string, string>): void {
  // map: wranglerId -> domPath
  for (const [wranglerId, domPath] of map.entries()) {
    const existing = findElementByWranglerId(wranglerId);
    if (existing) continue;
    const el = resolveByPath(domPath);
    if (el) el.classList.add(wranglerId);
  }
}

function resolveByPath(path: string): Element | null {
  // best-effort: domPath is a CSS-ish path with `>` separators; querySelector handles it
  try {
    return document.querySelector(path.replace(/:contains\(.*?\)/g, ""));
  } catch {
    return null;
  }
}
