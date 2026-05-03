#!/usr/bin/env node
/**
 * build-tokens.mjs
 * Generates tokens.css to both src/panel/styles/ and web/app/styles/ from
 * the YAML frontmatter in DESIGN.md.
 *
 * Mapping:
 *   colors.{name}        → --{name}
 *   colorsLight.{name}   → --{name} inside [data-theme="light"]
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DESIGN_MD = join(ROOT, "DESIGN.md");
const TEMPLATE = join(__dirname, "tokens.css.template");
const OUTPUTS = [
  join(ROOT, "src/panel/styles/tokens.css"),
  join(ROOT, "web/app/styles/tokens.css"),
];

/** Flatten a single group with its CSS-variable prefix. */
const GROUPS = [
  { key: "colors", prefix: "" },
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

function renderVar(name, value) {
  // Quote everything as-is — YAML already gave us the right type.
  // Numbers and bare strings flow straight through.
  return `  --${name}: ${value};`;
}

function renderGroup(obj, prefix, header) {
  if (!obj) return "";
  const lines = [`  /* ${header} */`];
  for (const [name, value] of Object.entries(obj)) {
    lines.push(renderVar(`${prefix}${name}`, value));
  }
  return lines.join("\n");
}

function renderDarkVars(fm) {
  const sections = [];
  for (const { key, prefix } of GROUPS) {
    const block = renderGroup(fm[key], prefix, key.toUpperCase());
    if (block) sections.push(block);
  }
  return sections.join("\n\n");
}

function renderLightVars(fm) {
  if (!fm.colorsLight) return "  /* (no light overrides) */";
  return renderGroup(fm.colorsLight, "", "LIGHT OVERRIDES");
}

function build() {
  const md = readFileSync(DESIGN_MD, "utf8");
  const fm = parseFrontmatter(md);
  const template = readFileSync(TEMPLATE, "utf8");
  return template
    .replace("{{TOKENS_DARK}}", renderDarkVars(fm))
    .replace("{{TOKENS_LIGHT}}", renderLightVars(fm));
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
