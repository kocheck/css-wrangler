import type { StylingSystem } from "@shared/types";

/**
 * STRONG Tailwind signals: classes that are essentially impossible outside Tailwind.
 * Color-with-shade utilities and arbitrary-value utilities are the giveaway.
 */
const STRONG_TAILWIND = [
  /^(bg|text|border|ring|fill|stroke|divide|outline|from|via|to|placeholder|caret|accent)-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
  /^[a-z-]+-\[[^\]]+\]$/, // arbitrary values: w-[24px], bg-[#abc], etc.
];

/**
 * MEDIUM Tailwind signals: structural utilities.
 * On their own these are common in any utility CSS (Bootstrap, Primer, hand-rolled).
 * Only count as Tailwind in combination with strong signals.
 */
const MEDIUM_TAILWIND = [
  /^(p|m|w|h|min-w|min-h|max-w|max-h)-\d+(\.\d+)?$/,
  /^(p|m)[xytrbl]-\d+(\.\d+)?$/,
  /^gap-\d+(\.\d+)?$/,
  /^space-[xy]-\d+$/,
  /^rounded(-(sm|md|lg|xl|2xl|3xl|full|none))?$/,
  /^items-(start|end|center|baseline|stretch)$/,
  /^justify-(start|end|center|between|around|evenly)$/,
  /^(font|tracking|leading)-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|tight|wide|none|loose)$/,
];

/**
 * Webpack css-loader default & common variants. These are the strongest signal of
 * CSS Modules in use.
 */
const CSS_MODULES_PATTERNS = [
  /^[A-Z][A-Za-z0-9]+[-_]module__[A-Za-z][A-Za-z0-9_-]*__[A-Za-z0-9]{4,}$/,
  /^[A-Z][A-Za-z0-9]+_[A-Za-z][A-Za-z0-9_-]*__[A-Za-z0-9]{4,}$/,
];

const CSS_IN_JS_PATTERNS = [
  /^css-[a-z0-9_-]{4,}$/i, // emotion
  /^sc-[a-z0-9_-]+$/i, // styled-components
  /^emotion-[a-z0-9_-]+$/i,
  /^jsx-\d+$/, // styled-jsx
  /^_[a-z0-9_-]{6,}$/i, // generic css-modules hash prefix
];

export function detectStylingSystem(): StylingSystem {
  const all = document.querySelectorAll("[class]");
  if (all.length === 0) return "plain";

  const strongTw = new Set<string>();
  const mediumTw = new Set<string>();
  let cssModuleHits = 0;
  let cssInJsHits = 0;

  const sample = Array.from(all).slice(0, 1000);
  for (const el of sample) {
    for (const cls of el.classList) {
      if (STRONG_TAILWIND.some((re) => re.test(cls))) strongTw.add(cls);
      else if (MEDIUM_TAILWIND.some((re) => re.test(cls))) mediumTw.add(cls);
      if (CSS_MODULES_PATTERNS.some((re) => re.test(cls))) cssModuleHits++;
      else if (CSS_IN_JS_PATTERNS.some((re) => re.test(cls))) cssInJsHits++;
    }
  }

  // CSS modules / CSS-in-JS first — generated classes are an unmistakable signal.
  if (cssModuleHits >= 8 || cssInJsHits >= 8) return "css-in-js";

  // Tailwind requires real strong signals (color-shade or arbitrary values).
  if (strongTw.size >= 8) return "tailwind";
  if (strongTw.size >= 3 && mediumTw.size >= 25) return "tailwind";

  return "plain";
}
