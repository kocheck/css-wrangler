import type { SelectorCandidate } from "@shared/types";

const GENERATED_CLASS_PATTERNS: RegExp[] = [
  /^css-[a-z0-9_-]{4,}$/i, // emotion / generated
  /^_[a-z0-9_-]{2,}$/i, // CSS modules hash prefix
  /^sc-[a-z0-9_-]+$/i, // styled-components
  /^emotion-[a-z0-9_-]+$/i,
  /^jsx-\d+$/i, // styled-jsx
  /^css-[0-9]+$/i,
  /^[a-z0-9]{6,}$/i, // long pure-alphanum hash
];

// webpack css-loader default: `{Component}-module__{name}__{hash}`
// Group 1 captures the source-side class name (e.g. `chatForm`).
const CSS_MODULES_RE = /^[A-Z][A-Za-z0-9]+[-_]module__([a-zA-Z][a-zA-Z0-9_-]*?)__[A-Za-z0-9]{4,}$/;

const MEANINGFUL_ID = /^[a-z][a-z0-9-]{2,}$/i;
const ALL_HEX = /^[a-f0-9]{8,}$/i;

export function extractCssModulesName(cls: string): string | null {
  const match = cls.match(CSS_MODULES_RE);
  return match ? (match[1] ?? null) : null;
}

export function isGeneratedClass(cls: string): boolean {
  if (!cls) return true;
  if (cls.startsWith("__wrangler-")) return true;
  // raw mangled CSS-modules classes are noise — they change every build
  if (CSS_MODULES_RE.test(cls)) return true;
  return GENERATED_CLASS_PATTERNS.some((re) => re.test(cls));
}

export function isMeaningfulId(id: string | null): boolean {
  if (!id) return false;
  if (ALL_HEX.test(id)) return false;
  return MEANINGFUL_ID.test(id);
}

/**
 * Returns the stable class names for an element.
 * - Raw CSS-modules classes (`Name-module__class__hash`) are unwrapped to
 *   their source-side name (`class`).
 * - Other generated patterns (emotion, styled-components, etc.) are dropped.
 */
export function getStableClasses(el: Element): string[] {
  const out: string[] = [];
  for (const cls of el.classList) {
    const extracted = extractCssModulesName(cls);
    if (extracted) {
      if (!out.includes(extracted)) out.push(extracted);
      continue;
    }
    if (!isGeneratedClass(cls)) out.push(cls);
  }
  return out;
}

function escapeAttrValue(v: string): string {
  return v.replace(/"/g, '\\"');
}

function visibleText(el: Element, max = 80): string | null {
  const raw = (el.textContent ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return null;
  return raw.length > max ? `${raw.slice(0, max)}…` : raw;
}

export function buildDomPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== "html") {
    const current: Element = node;
    const tag = current.tagName.toLowerCase();
    const stable = getStableClasses(current);
    let segment = tag;
    if (stable.length > 0) {
      segment += `.${stable[0]}`;
    } else if (current.parentElement) {
      const same = Array.from(current.parentElement.children).filter(
        (sib) => sib.tagName === current.tagName,
      );
      if (same.length > 1) {
        const idx = same.indexOf(current) + 1;
        segment += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(segment);
    node = current.parentElement;
    if (parts.length >= 6) break;
  }
  return parts.join(" > ");
}

export function generateSelectors(el: Element): SelectorCandidate[] {
  const candidates: SelectorCandidate[] = [];
  const tag = el.tagName.toLowerCase();

  // 1. data-* attributes
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith("data-")) continue;
    if (attr.name === "data-reactid" || attr.name.startsWith("data-v-")) continue;
    candidates.push({
      type: "data-attr",
      value: `[${attr.name}="${escapeAttrValue(attr.value)}"]`,
      stability: "high",
    });
  }

  // 2. id
  const id = el.getAttribute("id");
  if (isMeaningfulId(id)) {
    candidates.push({ type: "id", value: `#${id}`, stability: "high" });
  }

  // 3. stable classes
  const stable = getStableClasses(el);
  if (stable.length > 0) {
    candidates.push({
      type: "class",
      value: `${tag}.${stable.join(".")}`,
      stability: "medium",
    });
  }

  // 4. tag + visible text (only for interactive-ish elements)
  const text = visibleText(el);
  if (text && (tag === "button" || tag === "a" || tag === "label")) {
    candidates.push({
      type: "text",
      value: `${tag}:contains('${text.replace(/'/g, "\\'")}')`,
      stability: "medium",
    });
  }

  // 5. DOM path fallback (always present)
  candidates.push({
    type: "path",
    value: buildDomPath(el),
    stability: "low",
  });

  return candidates;
}

export function captureElementMetadata(el: Element) {
  return {
    tag: el.tagName.toLowerCase(),
    text: visibleText(el),
    role: el.getAttribute("role"),
    ariaLabel: el.getAttribute("aria-label"),
    selectors: generateSelectors(el),
    domPath: buildDomPath(el),
  };
}
