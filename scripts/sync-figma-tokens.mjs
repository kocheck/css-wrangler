#!/usr/bin/env node
/**
 * sync-figma-tokens.mjs
 *
 * Pulls variable values from the Css Wrangler Figma file and writes them
 * back into DESIGN.md's frontmatter. Run `pnpm tokens` afterwards to
 * regenerate src/panel/styles/tokens.css and web/app/styles/tokens.css.
 *
 * Workflow:
 *   1. Designer edits a token in Figma (e.g. accent/signal #ff3d00 → #ff5500).
 *   2. `pnpm tokens:sync` pulls the new value and rewrites DESIGN.md.
 *   3. `pnpm tokens` regenerates both tokens.css outputs.
 *   4. Commit DESIGN.md + both tokens.css together.
 *
 * Mapping (Figma variable name → DESIGN.md frontmatter key):
 *   fg/X, bg/X, border/X    → colors.<folder>-X     +  colorsLight.<folder>-X (Light mode)
 *   accent/X                → colors.accent-X        (single mode — accents are mode-agnostic)
 *   sp/N                    → spacing.N
 *   radius/X                → rounded.X
 *   type/X                  → type.X
 *   tracking/X              → tracking.X
 *   leading/X               → leading.X
 *
 * NOT synced (codebase-only — no Figma representation):
 *   fonts.*, motion.*, ease.*
 *
 * Two ways to feed values in:
 *
 *   A) Figma REST API (Enterprise plan only):
 *        FIGMA_TOKEN=figd_xxx pnpm tokens:sync
 *      Generate the PAT at https://www.figma.com/settings with
 *      `file_variables:read` scope.
 *
 *   B) Manual export via the Plugin API (any plan):
 *        Step 1 — Run the snippet in EXPORT_SNIPPET (see bottom of this
 *                 file) inside the Figma file's `Plugins → Development →
 *                 New Plugin → Run Plugin`, OR via an MCP tool that wraps
 *                 the Plugin API. The snippet returns a JSON blob.
 *        Step 2 — Save the JSON anywhere; e.g. `.context/figma-tokens.json`.
 *        Step 3 — Run: `pnpm tokens:sync --input .context/figma-tokens.json`
 *
 * Optional:
 *   - FIGMA_FILE_KEY env var: defaults to the canonical Css Wrangler file.
 *
 * Flags:
 *   --input <path>   Read variables from a JSON file produced by the Plugin
 *                    API export snippet. Bypasses the REST API entirely.
 *   --dry-run        Print the diff without writing.
 *   --verbose        Show every key compared, not just changes.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DESIGN_MD = join(ROOT, "DESIGN.md");
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY || "72WgrM79k7HUcFHYVFgpfC";
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const COLLECTION_NAME = "CSS Wrangler / Tokens";

const dryRun = process.argv.includes("--dry-run");
const verbose = process.argv.includes("--verbose");
const inputIdx = process.argv.indexOf("--input");
const inputPath = inputIdx >= 0 ? process.argv[inputIdx + 1] : null;

if (!FIGMA_TOKEN && !inputPath) {
  console.error("✗ Need either FIGMA_TOKEN env var (Enterprise) or --input <path> to a JSON file.");
  console.error("  Token: https://www.figma.com/settings → Personal access tokens (file_variables:read).");
  console.error("  Plugin-API export: see EXPORT_SNIPPET at the bottom of this script.");
  process.exit(1);
}

/**
 * Figma variable name (`fg/primary`, `sp/5`, …) → DESIGN.md location.
 * Returns `null` for variables we don't sync.
 */
function mapVariable(name) {
  const slash = name.indexOf("/");
  if (slash === -1) return null;
  const folder = name.slice(0, slash);
  const leaf = name.slice(slash + 1);
  switch (folder) {
    case "fg":
    case "bg":
    case "border":
      return { section: "colors", lightSection: "colorsLight", key: `${folder}-${leaf}` };
    case "accent":
      return { section: "colors", lightSection: null, key: `accent-${leaf}` };
    case "sp":
      return { section: "spacing", lightSection: null, key: leaf };
    case "radius":
      return { section: "rounded", lightSection: null, key: leaf };
    case "type":
      return { section: "type", lightSection: null, key: leaf };
    case "tracking":
      return { section: "tracking", lightSection: null, key: leaf };
    case "leading":
      return { section: "leading", lightSection: null, key: leaf };
    default:
      return null;
  }
}

/** Figma `{r, g, b}` (0–1 floats) → `#rrggbb`. Alpha is ignored — DESIGN.md doesn't carry it. */
function rgbToHex({ r, g, b }) {
  const h = (n) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Format a Figma FLOAT value the way DESIGN.md spells it. Section-specific
 * because units differ (px vs em vs unitless ratio).
 */
function formatFloat(section, raw) {
  const n = Number(raw);
  switch (section) {
    case "spacing":
      return n === 0 ? '"0"' : `${n}px`;
    case "rounded":
    case "type":
      return `${n}px`;
    case "tracking": {
      // Figma stores PERCENT (e.g. -1, 0, 4, 8) → DESIGN.md uses em (-0.01em, 0, 0.04em, 0.08em).
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

async function fetchVariables() {
  const url = `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/variables/local`;
  const res = await fetch(url, {
    headers: { "X-Figma-Token": FIGMA_TOKEN },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 403) {
      throw new Error(
        `Figma API ${res.status}: ${body}\n\n` +
          `  The /variables/local endpoint requires Enterprise. ` +
          `If you're not on Enterprise, use the --input flag instead — ` +
          `see EXPORT_SNIPPET at the bottom of this script.`
      );
    }
    throw new Error(`Figma API returned ${res.status}: ${body}`);
  }
  return res.json();
}

/**
 * Read a JSON blob produced by the Plugin-API export snippet. Shape mirrors
 * the REST API's so the rest of the pipeline doesn't care which path fed it.
 */
function readInputFile(path) {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.meta || !parsed.meta.variableCollections || !parsed.meta.variables) {
    throw new Error(
      `${path} is not in the expected shape. Re-export with the EXPORT_SNIPPET at the bottom of this script.`
    );
  }
  return parsed;
}

/**
 * Build a map keyed by `"<section>.<key>"` of the values Figma reports.
 * For colors with light overrides, also emits `"<lightSection>.<key>"`.
 */
function buildDesiredValues(figmaResponse) {
  const collections = figmaResponse.meta.variableCollections;
  const variables = figmaResponse.meta.variables;

  const collection = Object.values(collections).find((c) => c.name === COLLECTION_NAME);
  if (!collection) {
    throw new Error(`Variable collection "${COLLECTION_NAME}" not found in file ${FIGMA_FILE_KEY}`);
  }
  const dark = collection.modes.find((m) => m.name === "Dark");
  const light = collection.modes.find((m) => m.name === "Light");
  if (!dark) throw new Error(`Mode "Dark" not found in collection "${COLLECTION_NAME}"`);

  const desired = new Map();
  for (const v of Object.values(variables)) {
    if (v.variableCollectionId !== collection.id) continue;
    const mapping = mapVariable(v.name);
    if (!mapping) continue;

    const darkValue = v.valuesByMode[dark.modeId];
    let formatted;
    if (v.resolvedType === "COLOR") {
      formatted = `"${rgbToHex(darkValue)}"`;
    } else if (v.resolvedType === "FLOAT") {
      formatted = formatFloat(mapping.section, darkValue);
    } else {
      continue; // STRING/BOOLEAN unsupported for now
    }
    desired.set(`${mapping.section}.${mapping.key}`, formatted);

    if (mapping.lightSection && light) {
      const lightValue = v.valuesByMode[light.modeId];
      if (lightValue !== undefined && v.resolvedType === "COLOR") {
        desired.set(`${mapping.lightSection}.${mapping.key}`, `"${rgbToHex(lightValue)}"`);
      }
    }
  }
  return desired;
}

// Top-level section header: `colors:` (optional whitespace, optional comment).
// Comment requires leading whitespace before `#` so we don't mis-parse hex
// values like `"#fafaf7"` as a comment.
const SECTION_HEADER_RE = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(?:\s+#.*)?$/;
// Indented `<key>: <value>` line. Key may be quoted ("0") or bare.
// Value is captured greedily through end of line — YAML comments on token
// lines are exceedingly rare in this file and not worth the parsing risk.
const KEY_LINE_RE = /^(\s+)("?)([^":]+)\2:\s*(.+)$/;

/**
 * Walk DESIGN.md line-by-line within frontmatter, replacing any value whose
 * `<section>.<key>` exists in `desired` and differs. Preserves comments,
 * blank lines, ordering, and unrelated content (body, typography section,
 * components section, etc).
 */
function applyChanges(md, desired) {
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

  let currentSection = null;
  const changes = [];
  const seenKeys = new Set();

  for (let i = 1; i < frontmatterEnd; i++) {
    const line = lines[i];
    const headerMatch = line.match(SECTION_HEADER_RE);
    if (headerMatch) {
      currentSection = headerMatch[1];
      continue;
    }
    if (!currentSection) continue;

    const keyMatch = line.match(KEY_LINE_RE);
    if (!keyMatch) continue;
    const [, indent, quote, key, currentValue] = keyMatch;
    const lookup = `${currentSection}.${key}`;
    seenKeys.add(lookup);
    if (!desired.has(lookup)) continue;
    const newValue = desired.get(lookup);
    if (verbose) {
      console.log(`  ${lookup}  ${currentValue} ${currentValue === newValue ? "==" : "→"} ${newValue}`);
    }
    if (currentValue === newValue) continue;
    lines[i] = `${indent}${quote}${key}${quote}: ${newValue}`;
    changes.push({ section: currentSection, key, from: currentValue, to: newValue });
  }

  // Warn about keys that exist in Figma but aren't represented in DESIGN.md.
  // (e.g. someone added a new variable in Figma without updating DESIGN.md.)
  const orphans = [];
  for (const lookup of desired.keys()) {
    if (!seenKeys.has(lookup)) orphans.push(lookup);
  }

  return { updated: lines.join("\n"), changes, orphans };
}

async function main() {
  let data;
  if (inputPath) {
    console.log(`▸ Reading variables from ${inputPath}…`);
    data = readInputFile(inputPath);
  } else {
    console.log(`▸ Fetching variables from file ${FIGMA_FILE_KEY} via REST API…`);
    data = await fetchVariables();
  }
  const desired = buildDesiredValues(data);
  console.log(`  Pulled ${desired.size} key/value pairs from "${COLLECTION_NAME}".`);

  const md = readFileSync(DESIGN_MD, "utf8");
  const { updated, changes, orphans } = applyChanges(md, desired);

  if (changes.length === 0) {
    console.log("✓ DESIGN.md already in sync with Figma. Nothing to write.");
  } else {
    console.log(`\n${changes.length} change${changes.length === 1 ? "" : "s"}:`);
    for (const c of changes) {
      console.log(`  ${c.section}.${c.key}:  ${c.from}  →  ${c.to}`);
    }
  }

  if (orphans.length > 0) {
    console.log(`\n⚠  ${orphans.length} Figma variable${orphans.length === 1 ? "" : "s"} not represented in DESIGN.md:`);
    for (const o of orphans) console.log(`  ${o}`);
    console.log("  Add these to DESIGN.md frontmatter to bring them under codegen.");
  }

  if (changes.length > 0 && !dryRun) {
    writeFileSync(DESIGN_MD, updated);
    console.log(`\n✓ wrote ${relative(ROOT, DESIGN_MD)}`);
    console.log("  Run `pnpm tokens` to regenerate tokens.css for both targets.");
  } else if (changes.length > 0 && dryRun) {
    console.log("\n(dry-run — DESIGN.md not written)");
  }
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});

/**
 * EXPORT_SNIPPET — paste into a use_figma / Plugin-API tool to dump the
 * variable collection in the same shape the REST API returns. Save the
 * console output as JSON, then run:
 *
 *   pnpm tokens:sync --input <path-to-saved-json>
 *
 * ─── Snippet (copy from here through the end of the comment) ──────────────
 *
 * const colls = await figma.variables.getLocalVariableCollectionsAsync();
 * const variableCollections = {};
 * const variables = {};
 * for (const c of colls) {
 *   variableCollections[c.id] = {
 *     id: c.id,
 *     name: c.name,
 *     modes: c.modes,
 *     defaultModeId: c.defaultModeId,
 *     remote: c.remote,
 *   };
 *   for (const id of c.variableIds) {
 *     const v = await figma.variables.getVariableByIdAsync(id);
 *     variables[v.id] = {
 *       id: v.id,
 *       name: v.name,
 *       resolvedType: v.resolvedType,
 *       valuesByMode: v.valuesByMode,
 *       variableCollectionId: v.variableCollectionId,
 *       codeSyntax: v.codeSyntax,
 *       description: v.description,
 *       scopes: v.scopes,
 *     };
 *   }
 * }
 * return { meta: { variableCollections, variables } };
 *
 * ─── End snippet ──────────────────────────────────────────────────────────
 */
