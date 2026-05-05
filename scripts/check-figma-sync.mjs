#!/usr/bin/env node
/**
 * check-figma-sync.mjs
 *
 * CI verify gate. Compares DESIGN.md → expected token values against the
 * committed `.figma/figma-state.json` snapshot. Fails on:
 *
 *   - Missing variables: DESIGN.md declares a token that's not in Figma.
 *   - Value drift: DESIGN.md value differs from snapshot value (Dark or
 *     Light mode for color tokens that have a colorsLight pair).
 *   - Stale codeSyntax / description / scopes: Figma metadata doesn't match
 *     what `pnpm tokens:push` would generate.
 *
 * Warns (does NOT fail) on:
 *
 *   - Orphan variables in Figma that aren't declared in DESIGN.md. These
 *     could be intentional (some accent introduced in Figma first), but
 *     they're not under codegen until DESIGN.md catches up.
 *
 * Recovery: failure messages tell the author exactly what to do —
 * regenerate `.figma/push-patch.js`, paste in Figma, refresh the snapshot,
 * commit. The doc at .claude/figma-sync.md walks through the full loop.
 *
 * Flags:
 *   --state <path>   Snapshot location. Defaults to .figma/figma-state.json.
 *   --quiet          Print only the verdict line; suppress per-key drift.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { load as loadYaml } from "js-yaml";
import {
  COLLECTION_NAME,
  designKeyToFigmaName,
  parseDesignValue,
  parseFrontmatterEnvelope,
  iterateDesignTokens,
  rgbToHex,
} from "./lib/figma-token-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DESIGN_MD = join(ROOT, "DESIGN.md");
const DEFAULT_STATE = join(ROOT, ".figma", "figma-state.json");

const args = process.argv.slice(2);
const stateIdx = args.indexOf("--state");
const statePath = stateIdx >= 0 ? args[stateIdx + 1] : DEFAULT_STATE;
const quiet = args.includes("--quiet");

if (!existsSync(statePath)) {
  console.error(`✗ ${relative(ROOT, statePath)} not found.`);
  console.error("  Run the EXPORT_SNIPPET in Figma (see scripts/sync-figma-tokens.mjs)");
  console.error("  and save the JSON output to that path. Then commit and re-run CI.");
  process.exit(1);
}

const md = readFileSync(DESIGN_MD, "utf8");
const { yaml } = parseFrontmatterEnvelope(md);
const fm = loadYaml(yaml);
const state = JSON.parse(readFileSync(statePath, "utf8"));

const collection = Object.values(state.meta.variableCollections).find((c) => c.name === COLLECTION_NAME);
if (!collection) {
  console.error(`✗ Snapshot has no collection named "${COLLECTION_NAME}".`);
  process.exit(1);
}
const darkModeId = collection.modes.find((m) => m.name === "Dark")?.modeId;
const lightModeId = collection.modes.find((m) => m.name === "Light")?.modeId;
if (!darkModeId) {
  console.error(`✗ Snapshot has no "Dark" mode.`);
  process.exit(1);
}

const snapshotByName = new Map();
for (const v of Object.values(state.meta.variables)) {
  if (v.variableCollectionId === collection.id) snapshotByName.set(v.name, v);
}

// ─── Check every DESIGN.md token ─────────────────────────────────────────

const failures = [];
const seenFigmaNames = new Set();

function colorEqual(a, b) {
  if (!a || !b) return false;
  const eq = (x, y) => Math.round(x * 255) === Math.round(y * 255);
  return eq(a.r, b.r) && eq(a.g, b.g) && eq(a.b, b.b);
}
function floatEqual(a, b) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.001;
}
function fmtColor(rgb) {
  return rgb ? rgbToHex(rgb) : "(missing)";
}

for (const { section, key, value } of iterateDesignTokens(fm)) {
  const figmaName = designKeyToFigmaName(section, key);
  if (!figmaName) continue;
  seenFigmaNames.add(figmaName);

  const parsed = parseDesignValue(section, key, value);
  if (!parsed) {
    failures.push(`${section}.${key}: DESIGN.md value "${value}" couldn't be parsed for section "${section}".`);
    continue;
  }

  const existing = snapshotByName.get(figmaName);
  if (!existing) {
    failures.push(
      `${section}.${key} (Figma "${figmaName}"): MISSING from Figma snapshot. ` +
        `Run \`pnpm tokens:push\`, paste .figma/push-patch.js into Figma, then refresh the snapshot.`
    );
    continue;
  }

  // Value comparison
  const isLightOnly = section === "colorsLight";
  const targetModeId = isLightOnly ? lightModeId : darkModeId;
  const existingValue = existing.valuesByMode[targetModeId];
  const eq = parsed.type === "COLOR" ? colorEqual : floatEqual;
  if (!eq(parsed.value, existingValue)) {
    const expected = parsed.type === "COLOR" ? rgbToHex(parsed.value) : String(parsed.value);
    const actual = parsed.type === "COLOR" ? fmtColor(existingValue) : String(existingValue);
    failures.push(
      `${section}.${key} (Figma "${figmaName}", mode ${isLightOnly ? "Light" : "Dark"}): ` +
        `DESIGN.md = ${expected}, Figma = ${actual}.`
    );
  }

  // For accents and non-color tokens, Light should mirror Dark.
  // For fg/bg/border, the Light value comes from colorsLight section (handled separately).
  if (
    section === "colors" &&
    !figmaName.startsWith("fg/") &&
    !figmaName.startsWith("bg/") &&
    !figmaName.startsWith("border/") &&
    lightModeId
  ) {
    const lightExisting = existing.valuesByMode[lightModeId];
    if (!eq(parsed.value, lightExisting)) {
      const expected = rgbToHex(parsed.value);
      const actual = fmtColor(lightExisting);
      failures.push(
        `${section}.${key} (Figma "${figmaName}", mode Light): expected accent to mirror dark. DESIGN.md = ${expected}, Figma = ${actual}.`
      );
    }
  }

  // Metadata drift — codeSyntax + description.
  // (Scopes are checked loosely — exact match on the full expected list.)
  if (!isLightOnly) {
    const expectedCss = `var(--${figmaName.replace("/", "-")})`;
    if (existing.codeSyntax?.WEB !== expectedCss) {
      failures.push(
        `${figmaName}: codeSyntax.WEB = "${existing.codeSyntax?.WEB ?? "(unset)"}", expected "${expectedCss}".`
      );
    }
  }
}

// ─── Orphans (in Figma but not DESIGN.md) — warn-only ────────────────────

const orphans = [];
for (const v of snapshotByName.values()) {
  if (!seenFigmaNames.has(v.name)) orphans.push(v.name);
}

// ─── Verdict ─────────────────────────────────────────────────────────────

if (!quiet) {
  console.log(`▸ Comparing DESIGN.md to ${relative(ROOT, statePath)}…`);
  console.log(`  Tokens checked: ${seenFigmaNames.size}`);
}

if (failures.length > 0) {
  console.error(`✗ ${failures.length} drift${failures.length === 1 ? "" : "s"} found:`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("");
  console.error("To fix:");
  console.error("  1. pnpm tokens:push                   # writes .figma/push-patch.js");
  console.error("  2. Paste .figma/push-patch.js into Figma (Plugin-API runner) and run.");
  console.error("  3. Run the EXPORT_SNIPPET in Figma → save to .figma/figma-state.json.");
  console.error("  4. Commit DESIGN.md, tokens.css, .figma/push-patch.js, .figma/figma-state.json.");
  console.error("  See .claude/figma-sync.md for the full workflow.");
  process.exit(1);
}

if (orphans.length > 0) {
  console.warn(`⚠  ${orphans.length} variable${orphans.length === 1 ? "" : "s"} in Figma not declared in DESIGN.md (warn-only):`);
  for (const o of orphans) console.warn(`  ${o}`);
  console.warn("  Promote to DESIGN.md or remove from Figma to fully reconcile.");
}

console.log(`✓ DESIGN.md is in sync with Figma snapshot (${seenFigmaNames.size} tokens checked).`);
process.exit(0);
