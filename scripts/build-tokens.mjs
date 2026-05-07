#!/usr/bin/env node
/**
 * build-tokens.mjs
 * Generates tokens.css to both src/panel/styles/ and web/app/styles/ from
 * the YAML frontmatter in DESIGN.md.
 *
 * Color schema (post-Radix migration):
 *   colorScales:        list of @radix-ui/colors scales to import
 *     - sand            (neutrals)
 *     - tomato          (signal / brand)
 *     - grass           (applied)
 *     - amber           (diverges)
 *
 *   colorAliases:       semantic name → "scale.step"
 *     fg-primary: sand.12
 *     accent-signal: tomato.9
 *     ...
 *
 * Mapping:
 *   colorScales (raw)    → --<scale>-1 .. --<scale>-12     (dark in :root, light in [data-theme="light"])
 *   colorAliases (alias) → --<alias>: var(--<scale>-<step>)  (mode-stable; resolves through the scale)
 *   fonts.{name}         → --font-{name}
 *   type.{name}          → --type-{name}
 *   tracking.{name}      → --tracking-{name}
 *   leading.{name}       → --leading-{name}
 *   spacing.{name}       → --sp-{name}     (section name dictated by @google/design.md)
 *   rounded.{name}       → --radius-{name} (section name dictated by @google/design.md)
 *   motion.{name}        → --motion-{name}
 *   ease.{name}          → --ease-{name}
 *
 * `typography:` and `components:` sections are documentation only — they are
 * NOT codegen'd to CSS.
 *
 * Flags:
 *   --check   Regenerate to memory and diff against the existing tokens.css
 *             outputs. Exit 1 on drift in either. Used by `pnpm tokens:check`
 *             in CI.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import {
  SCALE_STEPS,
  iterateAliases,
  iterateScaleSteps,
} from "./lib/figma-token-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DESIGN_MD = join(ROOT, "DESIGN.md");
const TEMPLATE = join(__dirname, "tokens.css.template");
const OUTPUTS = [
  join(ROOT, "src/panel/styles/tokens.css"),
  join(ROOT, "web/app/styles/tokens.css"),
];

/** Non-color groups carry over unchanged from the pre-Radix schema. */
const NON_COLOR_GROUPS = [
  { key: "fonts", prefix: "font-" },
  { key: "type", prefix: "type-" },
  { key: "tracking", prefix: "tracking-" },
  { key: "leading", prefix: "leading-" },
  { key: "spacing", prefix: "sp-" },
  { key: "rounded", prefix: "radius-" },
  { key: "motion", prefix: "motion-" },
  { key: "ease", prefix: "ease-" },
];

function parseFrontmatter(md) {
  const lines = md.split("\n");
  if (lines[0] !== "---") {
    throw new Error("DESIGN.md must start with `---` frontmatter");
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error("DESIGN.md frontmatter has no closing `---`");
  const yaml = lines.slice(1, end).join("\n");
  return loadYaml(yaml);
}

function renderNonColorGroup(obj, prefix, header) {
  if (!obj) return "";
  const lines = [`  /* ${header} */`];
  for (const [name, value] of Object.entries(obj)) {
    lines.push(`  --${prefix}${name}: ${value};`);
  }
  return lines.join("\n");
}

/**
 * Emit raw scale steps + aliases in :root for dark mode.
 *
 * Layout:
 *   /* SCALE: SAND *​/
 *   --sand-1: #111110;
 *   ...
 *   /* SCALE: TOMATO *​/
 *   ...
 *   /* ALIASES *​/
 *   --fg-primary: var(--sand-12);
 *   ...
 */
function renderColorsDark(fm) {
  const sections = [];

  // One block per scale. We accumulate per-scale rather than per-step so
  // dark + light values for the same scale don't interleave in the diff.
  const byScaleDark = new Map();
  const byScaleLight = new Map();
  for (const entry of iterateScaleSteps(fm)) {
    const target = entry.mode === "dark" ? byScaleDark : byScaleLight;
    if (!target.has(entry.scale)) target.set(entry.scale, []);
    target.get(entry.scale).push(entry);
  }

  for (const [scale, entries] of byScaleDark) {
    const lines = [`  /* SCALE: ${scale.toUpperCase()} */`];
    entries.sort((a, b) => a.step - b.step);
    for (const e of entries) {
      lines.push(`  --${e.cssVar}: ${e.hex};`);
    }
    sections.push(lines.join("\n"));
  }

  // Aliases — same value in both modes; they resolve through the scale.
  const aliasLines = ["  /* ALIASES */"];
  for (const a of iterateAliases(fm)) {
    aliasLines.push(`  --${a.cssVar}: var(--${a.scale}-${a.step});`);
  }
  sections.push(aliasLines.join("\n"));

  return { dark: sections.join("\n\n"), lightByScale: byScaleLight };
}

function renderColorsLight(lightByScale) {
  if (lightByScale.size === 0) return "  /* (no light overrides) */";
  const sections = [];
  for (const [scale, entries] of lightByScale) {
    const lines = [`  /* SCALE: ${scale.toUpperCase()} (LIGHT) */`];
    entries.sort((a, b) => a.step - b.step);
    for (const e of entries) {
      lines.push(`  --${e.cssVar}: ${e.hex};`);
    }
    sections.push(lines.join("\n"));
  }
  // Aliases don't need light overrides — they resolve through the scale.
  return sections.join("\n\n");
}

function renderDarkVars(fm) {
  const { dark, lightByScale } = renderColorsDark(fm);
  const sections = [dark];
  for (const { key, prefix } of NON_COLOR_GROUPS) {
    const block = renderNonColorGroup(fm[key], prefix, key.toUpperCase());
    if (block) sections.push(block);
  }
  return { darkBlock: sections.join("\n\n"), lightByScale };
}

function build() {
  const md = readFileSync(DESIGN_MD, "utf8");
  const fm = parseFrontmatter(md);

  if (!fm.colorScales || !fm.colorAliases) {
    throw new Error(
      "DESIGN.md frontmatter missing colorScales or colorAliases. " +
        "The Radix-scale schema is required (no legacy fallback). " +
        "See .claude/figma-sync.md for the schema.",
    );
  }

  // Eagerly validate alias targets (iterateAliases throws on bad shape).
  for (const _ of iterateAliases(fm)) {
    // intentional no-op — iteration validates as a side effect
    void _;
  }

  const template = readFileSync(TEMPLATE, "utf8");
  const { darkBlock, lightByScale } = renderDarkVars(fm);
  return template
    .replace("{{TOKENS_DARK}}", darkBlock)
    .replace("{{TOKENS_LIGHT}}", renderColorsLight(lightByScale));
}

const check = process.argv.includes("--check");
const next = build();

if (check) {
  let drift = false;
  for (const out of OUTPUTS) {
    let current = "";
    try {
      current = readFileSync(out, "utf8");
    } catch (err) {
      // Missing file → drift. Other I/O errors (EACCES, EISDIR) need to surface.
      if (err.code !== "ENOENT") throw err;
    }
    if (current !== next) {
      const path = relative(ROOT, out);
      console.error(`✗ ${path} is out of sync with DESIGN.md`);
      drift = true;
    }
  }
  if (drift) {
    console.error("  Run `pnpm tokens` and commit the regenerated files.");
    process.exit(1);
  }
  console.log("✓ tokens.css in sync with DESIGN.md (both outputs)");
  process.exit(0);
}

for (const out of OUTPUTS) {
  writeFileSync(out, next);
  console.log(`✓ wrote ${relative(ROOT, out)}`);
}

// Sanity: emit a summary of what landed.
const md = readFileSync(DESIGN_MD, "utf8");
const fm = parseFrontmatter(md);
const scales = (fm.colorScales || []).join(", ");
const aliasCount = Object.keys(fm.colorAliases || {}).length;
const stepCount = (fm.colorScales || []).length * SCALE_STEPS;
console.log(
  `  ${stepCount} scale steps (${scales}) × 2 modes + ${aliasCount} aliases`,
);
