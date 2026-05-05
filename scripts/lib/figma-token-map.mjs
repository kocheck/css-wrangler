/**
 * figma-token-map.mjs — single source for the Figma↔DESIGN.md schema.
 *
 * Three sibling scripts import from here so the mapping rules live in one
 * place:
 *   - sync-figma-tokens.mjs  (Figma → DESIGN.md, designer's pull path)
 *   - push-figma-tokens.mjs  (DESIGN.md → Figma, generates the patch script)
 *   - check-figma-sync.mjs   (CI verify gate, reads the snapshot)
 *
 * Mapping rule (Figma variable name → DESIGN.md location):
 *   fg/X, bg/X, border/X    → colors.<folder>-X     +  colorsLight.<folder>-X
 *   accent/X                → colors.accent-X       (mode-agnostic, no light override)
 *   sp/N                    → spacing.N
 *   radius/X                → rounded.X
 *   type/X                  → type.X
 *   tracking/X              → tracking.X
 *   leading/X               → leading.X
 *
 * NOT synced (codebase-only): fonts.*, motion.*, ease.*
 */

export const COLLECTION_NAME = "CSS Wrangler / Tokens";

/**
 * Map a Figma variable name (`fg/primary`, `sp/5`, …) → DESIGN.md location.
 * Returns `null` if the variable doesn't belong to a synced category.
 */
export function mapVariable(name) {
  const slash = name.indexOf("/");
  if (slash === -1) return null;
  const folder = name.slice(0, slash);
  const leaf = name.slice(slash + 1);
  switch (folder) {
    case "fg":
    case "bg":
    case "border":
      return {
        section: "colors",
        lightSection: "colorsLight",
        key: `${folder}-${leaf}`,
        cssVar: `${folder}-${leaf}`,
      };
    case "accent":
      return {
        section: "colors",
        lightSection: null,
        key: `accent-${leaf}`,
        cssVar: `accent-${leaf}`,
      };
    case "sp":
      return { section: "spacing", lightSection: null, key: leaf, cssVar: `sp-${leaf}` };
    case "radius":
      return { section: "rounded", lightSection: null, key: leaf, cssVar: `radius-${leaf}` };
    case "type":
      return { section: "type", lightSection: null, key: leaf, cssVar: `type-${leaf}` };
    case "tracking":
      return { section: "tracking", lightSection: null, key: leaf, cssVar: `tracking-${leaf}` };
    case "leading":
      return { section: "leading", lightSection: null, key: leaf, cssVar: `leading-${leaf}` };
    default:
      return null;
  }
}

/** Inverse of `mapVariable`: DESIGN.md (section, key) → Figma variable name. */
export function designKeyToFigmaName(section, key) {
  if (section === "colors" || section === "colorsLight") {
    // key is `<folder>-X` for fg/bg/border/accent
    const dash = key.indexOf("-");
    if (dash === -1) return null;
    const folder = key.slice(0, dash);
    const leaf = key.slice(dash + 1);
    if (!["fg", "bg", "border", "accent"].includes(folder)) return null;
    return `${folder}/${leaf}`;
  }
  if (section === "spacing") return `sp/${key}`;
  if (section === "rounded") return `radius/${key}`;
  if (section === "type") return `type/${key}`;
  if (section === "tracking") return `tracking/${key}`;
  if (section === "leading") return `leading/${key}`;
  return null; // fonts, motion, ease — not synced
}

/** Figma `{r, g, b}` (0–1 floats) → `#rrggbb`. Alpha is ignored. */
export function rgbToHex({ r, g, b }) {
  const h = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Hex `#rrggbb` (any case, optional `#`) → Figma `{r, g, b}` 0–1 floats. */
export function hexToRgb(hex) {
  const s = hex.replace("#", "");
  return {
    r: parseInt(s.slice(0, 2), 16) / 255,
    g: parseInt(s.slice(2, 4), 16) / 255,
    b: parseInt(s.slice(4, 6), 16) / 255,
  };
}

/**
 * Format a Figma FLOAT value the way DESIGN.md spells it. Section-specific
 * because units differ (px vs em vs unitless ratio). Used by the Figma →
 * DESIGN.md pull and the verify gate.
 */
export function formatFloat(section, raw) {
  const n = Number(raw);
  switch (section) {
    case "spacing":
      return n === 0 ? '"0"' : `${n}px`;
    case "rounded":
    case "type":
      return `${n}px`;
    case "tracking": {
      // Figma stores PERCENT (-1, 0, 4, 8) → DESIGN.md uses em (-0.01em, 0, 0.04em, 0.08em).
      if (n === 0) return "0";
      const em = (n / 100).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
      return `${em}em`;
    }
    case "leading":
      // Figma stores PERCENT (120, 140) → DESIGN.md uses ratio (1.2, 1.4).
      return (n / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  return String(n);
}

/**
 * Parse DESIGN.md frontmatter values back to the Figma representation. Used
 * by the push script (DESIGN.md → Figma) and the verify gate.
 *
 * Returns { type: "COLOR" | "FLOAT", value, section, key } or null if the
 * value can't be parsed for the given section.
 */
export function parseDesignValue(section, key, raw) {
  if (typeof raw !== "string") raw = String(raw);
  const trimmed = raw.replace(/^"|"$/g, "").trim();
  if (section === "colors" || section === "colorsLight") {
    if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return null;
    return { type: "COLOR", value: hexToRgb(trimmed) };
  }
  if (section === "spacing") {
    const n = trimmed === "0" ? 0 : parseFloat(trimmed.replace("px", ""));
    if (Number.isNaN(n)) return null;
    return { type: "FLOAT", value: n };
  }
  if (section === "rounded" || section === "type") {
    const n = parseFloat(trimmed.replace("px", ""));
    if (Number.isNaN(n)) return null;
    return { type: "FLOAT", value: n };
  }
  if (section === "tracking") {
    if (trimmed === "0") return { type: "FLOAT", value: 0 };
    const em = parseFloat(trimmed.replace("em", ""));
    if (Number.isNaN(em)) return null;
    return { type: "FLOAT", value: em * 100 }; // → percent
  }
  if (section === "leading") {
    const ratio = parseFloat(trimmed);
    if (Number.isNaN(ratio)) return null;
    return { type: "FLOAT", value: ratio * 100 }; // → percent
  }
  return null;
}

/**
 * Walk a parsed frontmatter object and yield every (section, key, value)
 * triple that maps to a Figma variable. Skips fonts/motion/ease.
 */
export function* iterateDesignTokens(frontmatter) {
  const SYNCED_SECTIONS = ["colors", "colorsLight", "spacing", "rounded", "type", "tracking", "leading"];
  for (const section of SYNCED_SECTIONS) {
    const obj = frontmatter[section];
    if (!obj) continue;
    for (const [key, value] of Object.entries(obj)) {
      yield { section, key, value };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DESIGN.md frontmatter parser — line-level, comment-preserving
// ─────────────────────────────────────────────────────────────────────────

// Top-level section header: `colors:` (optional whitespace, optional comment).
// Comment requires leading whitespace before `#` so we don't mis-parse hex
// values like `"#fafaf7"` as a comment.
export const SECTION_HEADER_RE = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(?:\s+#.*)?$/;

// Indented `<key>: <value>` line. Key may be quoted ("0") or bare.
// Value is captured greedily through end of line — YAML comments on token
// lines are exceedingly rare in this file and not worth the parsing risk.
export const KEY_LINE_RE = /^(\s+)("?)([^":]+)\2:\s*(.+)$/;

/**
 * Returns { yaml, lines, frontmatterStart, frontmatterEnd }.
 * Throws if DESIGN.md is malformed.
 */
export function parseFrontmatterEnvelope(md) {
  const lines = md.split("\n");
  if (lines[0] !== "---") throw new Error("DESIGN.md must start with `---` frontmatter");
  let frontmatterEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      frontmatterEnd = i;
      break;
    }
  }
  if (frontmatterEnd === -1) throw new Error("DESIGN.md frontmatter has no closing `---`");
  return {
    yaml: lines.slice(1, frontmatterEnd).join("\n"),
    lines,
    frontmatterStart: 1,
    frontmatterEnd,
  };
}
