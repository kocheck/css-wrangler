#!/usr/bin/env node
/**
 * check-figma-sync.mjs
 *
 * CI verify gate. Compares DESIGN.md → expected Figma state against the
 * committed `.figma/figma-state.json` snapshot. Fails on:
 *
 *   - Missing variables: a token DESIGN.md declares is absent from Figma.
 *   - Scale-step value drift: a Radix scale step's hex differs (Dark or
 *     Light) between @radix-ui/colors and Figma.
 *   - Alias mis-routing: an alias variable doesn't point at the expected
 *     scale-step variable, or isn't an alias at all.
 *   - Non-color value drift: spacing/type/etc. value differs.
 *   - Stale codeSyntax.
 *
 * Warns (does NOT fail) on:
 *
 *   - Orphan variables in Figma that aren't declared in DESIGN.md.
 *
 * Recovery: failure messages tell the author what to do — regenerate
 * `.figma/push-patch.js`, run via Figma, refresh the snapshot, commit.
 * The doc at .claude/figma-sync.md walks through the full loop.
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
  hexToRgb,
  iterateAliases,
  iterateNonColorTokens,
  iterateScaleSteps,
  nonColorDesignKeyToFigmaName,
  parseFrontmatterEnvelope,
  parseNonColorDesignValue,
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
const snapshotById = new Map();
for (const v of Object.values(state.meta.variables)) {
  if (v.variableCollectionId === collection.id) {
    snapshotByName.set(v.name, v);
    snapshotById.set(v.id, v);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

const failures = [];
const seenFigmaNames = new Set();

function colorEqual(a, b) {
  if (!a || !b) return false;
  if (a.type === "VARIABLE_ALIAS" || b.type === "VARIABLE_ALIAS") return false;
  const eq = (x, y) => Math.round(x * 255) === Math.round(y * 255);
  return eq(a.r, b.r) && eq(a.g, b.g) && eq(a.b, b.b);
}
function floatEqual(a, b) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.001;
}
function fmtColor(rgb) {
  if (!rgb) return "(missing)";
  if (rgb.type === "VARIABLE_ALIAS") {
    const target = snapshotById.get(rgb.id);
    return `alias→${target?.name ?? "(unknown id)"}`;
  }
  return rgbToHex(rgb);
}

function checkCodeSyntax(figmaName, expected, existing) {
  if (existing.codeSyntax?.WEB !== expected) {
    failures.push(
      `${figmaName}: codeSyntax.WEB = "${existing.codeSyntax?.WEB ?? "(unset)"}", expected "${expected}".`,
    );
  }
}

// ─── 1. Scale steps (raw RGB per mode, value sourced from @radix-ui/colors) ───

for (const entry of iterateScaleSteps(fm)) {
  seenFigmaNames.add(entry.figmaName);
  const existing = snapshotByName.get(entry.figmaName);
  if (!existing) {
    failures.push(
      `colorScales[${entry.scale}].${entry.step} (Figma "${entry.figmaName}"): MISSING from snapshot. ` +
        `Run pnpm tokens:push, run the patch via Figma, refresh the snapshot.`,
    );
    continue;
  }
  const targetModeId = entry.mode === "dark" ? darkModeId : lightModeId;
  if (!targetModeId) continue; // light mode optional in snapshot edge cases
  const expected = hexToRgb(entry.hex);
  const actual = existing.valuesByMode[targetModeId];
  if (!colorEqual(expected, actual)) {
    failures.push(
      `${entry.figmaName} (${entry.mode}): expected ${entry.hex}, snapshot = ${fmtColor(actual)}.`,
    );
  }
  // Code syntax is the same between modes, only check once on dark pass.
  if (entry.mode === "dark") {
    checkCodeSyntax(entry.figmaName, `var(--${entry.cssVar})`, existing);
  }
}

// ─── 2. Aliases (VARIABLE_ALIAS pointing at the right scale step) ───

for (const a of iterateAliases(fm)) {
  seenFigmaNames.add(a.figmaName);
  const existing = snapshotByName.get(a.figmaName);
  if (!existing) {
    failures.push(
      `colorAliases.${a.name} (Figma "${a.figmaName}"): MISSING from snapshot. ` +
        `Run pnpm tokens:push, run the patch via Figma, refresh the snapshot.`,
    );
    continue;
  }
  const expectedTargetName = `${a.scale}/${a.step}`;
  for (const [modeName, modeId] of [["Dark", darkModeId], ["Light", lightModeId]]) {
    if (!modeId) continue;
    const value = existing.valuesByMode[modeId];
    if (!value || value.type !== "VARIABLE_ALIAS") {
      failures.push(
        `${a.figmaName} (${modeName}): expected alias to ${expectedTargetName}, got ${fmtColor(value)}.`,
      );
      continue;
    }
    const target = snapshotById.get(value.id);
    if (!target) {
      failures.push(`${a.figmaName} (${modeName}): alias points at unknown variable id "${value.id}".`);
      continue;
    }
    if (target.name !== expectedTargetName) {
      failures.push(
        `${a.figmaName} (${modeName}): alias points at "${target.name}", expected "${expectedTargetName}".`,
      );
    }
  }
  checkCodeSyntax(a.figmaName, `var(--${a.cssVar})`, existing);
}

// ─── 3. Non-color tokens (FLOAT, mode-stable) ───

for (const { section, key, value } of iterateNonColorTokens(fm)) {
  const figmaName = nonColorDesignKeyToFigmaName(section, key);
  if (!figmaName) continue;
  seenFigmaNames.add(figmaName);
  const existing = snapshotByName.get(figmaName);
  if (!existing) {
    failures.push(
      `${section}.${key} (Figma "${figmaName}"): MISSING from snapshot. ` +
        `Run pnpm tokens:push, run the patch via Figma, refresh the snapshot.`,
    );
    continue;
  }
  const parsed = parseNonColorDesignValue(section, value);
  if (!parsed) {
    failures.push(`${section}.${key}: DESIGN.md value "${value}" couldn't be parsed for section "${section}".`);
    continue;
  }
  const darkExisting = existing.valuesByMode[darkModeId];
  if (!floatEqual(parsed.value, darkExisting)) {
    failures.push(
      `${section}.${key} (Figma "${figmaName}", mode Dark): DESIGN.md = ${parsed.value}, Figma = ${darkExisting}.`,
    );
  }
  if (lightModeId) {
    const lightExisting = existing.valuesByMode[lightModeId];
    if (!floatEqual(parsed.value, lightExisting)) {
      failures.push(
        `${section}.${key} (Figma "${figmaName}", mode Light): DESIGN.md = ${parsed.value}, Figma = ${lightExisting} (non-color tokens are mode-stable).`,
      );
    }
  }
  checkCodeSyntax(figmaName, `var(--${figmaName.replace("/", "-")})`, existing);
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
  console.error("  2. Run .figma/push-patch.js in Figma via use_figma.");
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
