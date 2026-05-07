/**
 * figma-token-map.mjs — single source for the Figma↔DESIGN.md schema.
 *
 * Three sibling scripts import from here so the mapping rules live in one
 * place:
 *   - sync-figma-tokens.mjs  (Figma → DESIGN.md, designer's pull path)
 *   - push-figma-tokens.mjs  (DESIGN.md → Figma, generates the patch script)
 *   - check-figma-sync.mjs   (CI verify gate, reads the snapshot)
 *
 * # Schema (post-Radix migration)
 *
 * Color tokens use a two-layer schema:
 *
 *   colorScales:                # Radix scales to import (from @radix-ui/colors)
 *     - sand                    # neutrals
 *     - tomato                  # signal / brand
 *     - grass                   # applied
 *     - amber                   # diverges
 *
 *   colorAliases:               # Semantic names → scale.step
 *     fg-primary: sand.12
 *     accent-signal: tomato.9
 *     ...
 *
 * Non-color tokens (spacing, type, etc.) keep the legacy shape — they're
 * not part of the Radix migration.
 *
 * Mapping rules (DESIGN.md → Figma variable name):
 *   colorScales[scale] step N   → "<scale>/<N>"          (e.g. "sand/1", "tomato/12")
 *   colorAliases[<folder>-<rest>] → "<folder>/<rest>"    (e.g. "fg/primary", "bg/elev-0")
 *   spacing.N                   → "sp/N"
 *   rounded.X                   → "radius/X"
 *   type.X                      → "type/X"
 *   tracking.X                  → "tracking/X"
 *   leading.X                   → "leading/X"
 *
 * NOT synced (codebase-only): fonts.*, motion.*, ease.*
 */

import * as RadixColors from "@radix-ui/colors";

export const COLLECTION_NAME = "CSS Wrangler / Tokens";

// ─────────────────────────────────────────────────────────────────────────
// Radix scale access
// ─────────────────────────────────────────────────────────────────────────

/** Number of steps in every Radix scale. */
export const SCALE_STEPS = 12;

/** Both modes a Radix scale ships. */
export const SCALE_MODES = ["dark", "light"];

/**
 * Returns the hex string for a (scale, step, mode). Throws if the scale
 * isn't shipped by @radix-ui/colors. `step` is 1-indexed (1..12).
 */
export function radixHex(scale, step, mode) {
  const exportName = mode === "dark" ? `${scale}Dark` : scale;
  const obj = RadixColors[exportName];
  if (!obj) {
    throw new Error(
      `Unknown Radix scale "${scale}" (mode "${mode}"). ` +
        `Check @radix-ui/colors exports for "${exportName}".`,
    );
  }
  const key = `${scale}${step}`;
  const hex = obj[key];
  if (!hex) {
    throw new Error(`Radix scale "${scale}" (mode "${mode}") has no step ${step} (looked up "${key}").`);
  }
  return hex;
}

// ─────────────────────────────────────────────────────────────────────────
// Iterators over DESIGN.md frontmatter
// ─────────────────────────────────────────────────────────────────────────

/**
 * Yield every (scale, step, mode, hex) the DESIGN.md frontmatter pulls in.
 * Source of values is @radix-ui/colors; DESIGN.md only declares which
 * scales to include.
 */
export function* iterateScaleSteps(fm) {
  const scales = fm.colorScales || [];
  for (const scale of scales) {
    for (let step = 1; step <= SCALE_STEPS; step++) {
      for (const mode of SCALE_MODES) {
        yield {
          scale,
          step,
          mode,
          hex: radixHex(scale, step, mode),
          figmaName: `${scale}/${step}`,
          cssVar: `${scale}-${step}`,
        };
      }
    }
  }
}

/**
 * Yield every (alias, scale, step) declared in colorAliases.
 * Throws on malformed entries (non-string values, unknown scale, bad step).
 */
export function* iterateAliases(fm) {
  const aliases = fm.colorAliases || {};
  const declaredScales = new Set(fm.colorScales || []);
  for (const [name, target] of Object.entries(aliases)) {
    if (typeof target !== "string") {
      throw new Error(`colorAliases.${name}: expected "scale.step" string, got ${JSON.stringify(target)}`);
    }
    const dot = target.indexOf(".");
    if (dot === -1) {
      throw new Error(`colorAliases.${name} = "${target}": expected "scale.step" (e.g. "sand.12")`);
    }
    const scale = target.slice(0, dot);
    const stepStr = target.slice(dot + 1);
    const step = Number(stepStr);
    if (!Number.isInteger(step) || step < 1 || step > SCALE_STEPS) {
      throw new Error(`colorAliases.${name} = "${target}": step must be 1..${SCALE_STEPS}, got "${stepStr}"`);
    }
    if (!declaredScales.has(scale)) {
      throw new Error(
        `colorAliases.${name} = "${target}": scale "${scale}" is not in colorScales. ` +
          `Add it to colorScales or pick a different scale.`,
      );
    }
    yield {
      name,
      scale,
      step,
      figmaName: aliasNameToFigmaPath(name),
      cssVar: name,
      target, // raw "scale.step" string (preserved for diagnostics)
    };
  }
}

/**
 * Convert a flat alias key like `fg-primary`, `bg-elev-0`, `accent-signal`,
 * `border-strong`, `border-focus` into the Figma variable folder path
 * (`fg/primary`, `bg/elev-0`, `accent/signal`, `border/strong`,
 * `border/focus`). Folder = substring before the first dash.
 */
export function aliasNameToFigmaPath(name) {
  const dash = name.indexOf("-");
  if (dash === -1) return name;
  return `${name.slice(0, dash)}/${name.slice(dash + 1)}`;
}

/** Inverse: Figma path → flat alias key. */
export function figmaPathToAliasName(path) {
  return path.replace("/", "-");
}

// ─────────────────────────────────────────────────────────────────────────
// Non-color tokens (spacing, type, tracking, leading, rounded)
// Legacy schema, kept verbatim from before the Radix migration.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Map a non-color Figma variable name (`sp/5`, `type/body`, …) to its
 * DESIGN.md location. Returns `null` for unknown folders.
 */
export function mapNonColorVariable(name) {
  const slash = name.indexOf("/");
  if (slash === -1) return null;
  const folder = name.slice(0, slash);
  const leaf = name.slice(slash + 1);
  switch (folder) {
    case "sp":
      return { section: "spacing", key: leaf, cssVar: `sp-${leaf}` };
    case "radius":
      return { section: "rounded", key: leaf, cssVar: `radius-${leaf}` };
    case "type":
      return { section: "type", key: leaf, cssVar: `type-${leaf}` };
    case "tracking":
      return { section: "tracking", key: leaf, cssVar: `tracking-${leaf}` };
    case "leading":
      return { section: "leading", key: leaf, cssVar: `leading-${leaf}` };
    default:
      return null;
  }
}

/** Inverse: (section, key) → Figma name for non-color tokens. */
export function nonColorDesignKeyToFigmaName(section, key) {
  if (section === "spacing") return `sp/${key}`;
  if (section === "rounded") return `radius/${key}`;
  if (section === "type") return `type/${key}`;
  if (section === "tracking") return `tracking/${key}`;
  if (section === "leading") return `leading/${key}`;
  return null;
}

/** Yield every non-color (section, key, value) triple under codegen. */
export function* iterateNonColorTokens(frontmatter) {
  const SYNCED = ["spacing", "rounded", "type", "tracking", "leading"];
  for (const section of SYNCED) {
    const obj = frontmatter[section];
    if (!obj) continue;
    for (const [key, value] of Object.entries(obj)) {
      yield { section, key, value };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Color helpers — RGB ↔ hex
// ─────────────────────────────────────────────────────────────────────────

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
 * Parse DESIGN.md frontmatter values for non-color tokens back to the
 * Figma representation. Returns { type: "FLOAT", value } or null.
 */
export function parseNonColorDesignValue(section, raw) {
  if (typeof raw !== "string") raw = String(raw);
  const trimmed = raw.replace(/^"|"$/g, "").trim();
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

// ─────────────────────────────────────────────────────────────────────────
// DESIGN.md frontmatter envelope parser
// ─────────────────────────────────────────────────────────────────────────

// Top-level section header: `colors:` (optional whitespace, optional comment).
// Comment requires leading whitespace before `#` so we don't mis-parse hex
// values like `"#fafaf7"` as a comment.
export const SECTION_HEADER_RE = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(?:\s+#.*)?$/;

// Indented `<key>: <value>` line. Key may be quoted ("0") or bare.
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
