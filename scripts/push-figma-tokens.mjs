#!/usr/bin/env node
/**
 * push-figma-tokens.mjs
 *
 * DESIGN.md → Figma direction. Generates a self-contained Plugin-API JS
 * snippet that, when pasted into a Figma `use_figma`-style runner, will
 * upsert every variable in `CSS Wrangler / Tokens` to match the
 * frontmatter in DESIGN.md.
 *
 * # Variable shape (post-Radix migration)
 *
 * Two layers, mirroring tokens.css:
 *
 * 1. **Raw scale steps** — one Figma variable per (scale, step), e.g.
 *    `sand/1`, `tomato/9`. Stores raw RGB for both Dark and Light modes
 *    (values come from @radix-ui/colors at codegen time).
 *
 * 2. **Semantic aliases** — one Figma variable per alias, e.g.
 *    `fg/primary`, `accent/signal`. Stores a VARIABLE_ALIAS reference
 *    pointing at the target scale step. Same alias for both modes —
 *    the alias resolves through the scale, which is mode-aware.
 *
 * Non-color tokens (sp/N, type/X, …) keep their pre-Radix shape.
 *
 * Order in the emitted patch: scale steps FIRST, aliases AFTER. This is
 * required because alias creation needs the target variable to exist.
 *
 * Workflow:
 *   1. Edit DESIGN.md.
 *   2. `pnpm tokens` to regenerate tokens.css.
 *   3. `pnpm tokens:push` — writes `.figma/push-patch.js`.
 *   4. Open Figma → run the patch via `use_figma` (or paste into a
 *      Plugin-API runner).
 *   5. Run the EXPORT_SNIPPET (in scripts/sync-figma-tokens.mjs) →
 *      save to `.figma/figma-state.json`.
 *   6. `pnpm tokens:check-figma` should now pass.
 *   7. Commit DESIGN.md + tokens.css + .figma/* artifacts.
 *
 * Flags:
 *   --output <path>  Destination for the patch JS. Defaults to .figma/push-patch.js.
 *   --stdout         Print to stdout instead of writing a file.
 *   --state <path>   Read Figma's current state from a snapshot file.
 *                    Defaults to .figma/figma-state.json. Used to compute
 *                    the diff so the generated patch is minimal.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
} from "./lib/figma-token-map.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DESIGN_MD = join(ROOT, "DESIGN.md");
const DEFAULT_STATE = join(ROOT, ".figma", "figma-state.json");
const DEFAULT_OUTPUT = join(ROOT, ".figma", "push-patch.js");

const args = process.argv.slice(2);
const stdout = args.includes("--stdout");
const outputIdx = args.indexOf("--output");
const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : DEFAULT_OUTPUT;
const stateIdx = args.indexOf("--state");
const stateExplicit = stateIdx >= 0;
const statePath = stateExplicit ? args[stateIdx + 1] : DEFAULT_STATE;

// ─────────────────────────────────────────────────────────────────────────
// 1. Load DESIGN.md and the current Figma state snapshot.
// ─────────────────────────────────────────────────────────────────────────

const md = readFileSync(DESIGN_MD, "utf8");
const { yaml } = parseFrontmatterEnvelope(md);
const fm = loadYaml(yaml);

let state = null;
if (existsSync(statePath)) {
  state = JSON.parse(readFileSync(statePath, "utf8"));
} else if (stateExplicit) {
  console.error(`✗ --state ${statePath} does not exist.`);
  process.exit(1);
} else {
  console.warn(
    `⚠ ${relative(ROOT, statePath)} is missing. The patch will assume Figma is empty ` +
      `and emit createVariable() for every token — pasting that into a populated Figma file ` +
      `will throw "variable already exists." Run the EXPORT_SNIPPET first to seed the snapshot.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Build the desired Figma state from DESIGN.md.
// ─────────────────────────────────────────────────────────────────────────
//
// Each entry in `desired` describes one Figma variable. `kind` discriminates:
//   - "scale-step" : raw RGB per mode (color)
//   - "alias"      : VARIABLE_ALIAS to another variable in this collection
//   - "float"      : raw FLOAT per mode (mode-stable for non-color tokens)

const desired = new Map();

function scopesFor(figmaName) {
  // Aliases get role-specific scopes.
  if (figmaName.startsWith("fg/")) return ["TEXT_FILL"];
  if (figmaName.startsWith("bg/")) return ["FRAME_FILL", "SHAPE_FILL"];
  if (figmaName.startsWith("border/")) return ["STROKE_COLOR"];
  if (figmaName.startsWith("accent/")) return ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
  // Non-color tokens.
  if (figmaName.startsWith("sp/")) return ["GAP", "WIDTH_HEIGHT"];
  if (figmaName.startsWith("radius/")) return ["CORNER_RADIUS"];
  if (figmaName.startsWith("type/")) return ["FONT_SIZE"];
  if (figmaName.startsWith("tracking/")) return ["LETTER_SPACING"];
  if (figmaName.startsWith("leading/")) return ["LINE_HEIGHT"];
  // Scale steps default to all color scopes — they're meant to be reusable.
  return ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
}

const parseErrors = [];

// 2a. Scale steps (color, raw RGB per mode).
const scaleByEntry = new Map(); // figmaName → { dark, light }
for (const entry of iterateScaleSteps(fm)) {
  const slot = scaleByEntry.get(entry.figmaName) ?? { figmaName: entry.figmaName, scale: entry.scale, step: entry.step, dark: null, light: null };
  if (entry.mode === "dark") slot.dark = hexToRgb(entry.hex);
  else slot.light = hexToRgb(entry.hex);
  scaleByEntry.set(entry.figmaName, slot);
}
for (const slot of scaleByEntry.values()) {
  desired.set(slot.figmaName, {
    name: slot.figmaName,
    cssVar: slot.figmaName.replace("/", "-"),
    type: "COLOR",
    kind: "scale-step",
    scopes: scopesFor(slot.figmaName),
    description: `Radix Colors · ${slot.scale}.${slot.step}`,
    dark: slot.dark,
    light: slot.light,
  });
}

// 2b. Aliases (color, VARIABLE_ALIAS per mode — both modes point at the same target).
for (const a of iterateAliases(fm)) {
  const targetFigmaName = `${a.scale}/${a.step}`;
  desired.set(a.figmaName, {
    name: a.figmaName,
    cssVar: a.cssVar,
    type: "COLOR",
    kind: "alias",
    scopes: scopesFor(a.figmaName),
    description: `DESIGN.md · colorAliases.${a.name} → ${a.target}`,
    aliasTargetName: targetFigmaName,
  });
}

// 2c. Non-color tokens (FLOAT, mode-stable).
for (const { section, key, value } of iterateNonColorTokens(fm)) {
  const figmaName = nonColorDesignKeyToFigmaName(section, key);
  if (!figmaName) continue;
  const parsed = parseNonColorDesignValue(section, value);
  if (!parsed) {
    parseErrors.push(`${section}.${key} = ${JSON.stringify(value)}`);
    continue;
  }
  desired.set(figmaName, {
    name: figmaName,
    cssVar: figmaName.replace("/", "-"),
    type: parsed.type,
    kind: "float",
    scopes: scopesFor(figmaName),
    description: `DESIGN.md · ${section}.${key}`,
    dark: parsed.value,
    light: parsed.value,
  });
}

if (parseErrors.length > 0) {
  console.error(`✗ ${parseErrors.length} DESIGN.md value${parseErrors.length === 1 ? "" : "s"} could not be parsed:`);
  for (const e of parseErrors) console.error(`  ${e}`);
  console.error("  Fix the frontmatter and re-run. The patch was not generated.");
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Diff against the snapshot to compute add / update / remove.
// ─────────────────────────────────────────────────────────────────────────

const ops = { creates: [], updates: [], removes: [] };

const snapshotByName = new Map();
const snapshotById = new Map();
if (state) {
  for (const v of Object.values(state.meta.variables)) {
    snapshotByName.set(v.name, v);
    snapshotById.set(v.id, v);
  }
}
const snapshotCollection = state
  ? Object.values(state.meta.variableCollections).find((c) => c.name === COLLECTION_NAME)
  : null;
const snapshotDarkModeId = snapshotCollection?.modes.find((m) => m.name === "Dark")?.modeId;
const snapshotLightModeId = snapshotCollection?.modes.find((m) => m.name === "Light")?.modeId;

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

/**
 * For an alias slot, check whether a snapshot value is already an alias to
 * the right target name. Returns true on match, false on either "not an
 * alias" or "alias but wrong target".
 */
function aliasMatches(snapshotValue, expectedTargetName) {
  if (!snapshotValue || snapshotValue.type !== "VARIABLE_ALIAS") return false;
  const target = snapshotById.get(snapshotValue.id);
  return target?.name === expectedTargetName;
}

for (const slot of desired.values()) {
  const existing = snapshotByName.get(slot.name);
  if (!existing) {
    ops.creates.push(slot);
    continue;
  }
  const codeSyntaxChanged = existing.codeSyntax?.WEB !== `var(--${slot.cssVar})`;

  if (slot.kind === "alias") {
    const darkExisting = existing.valuesByMode[snapshotDarkModeId];
    const lightExisting = existing.valuesByMode[snapshotLightModeId];
    const darkChanged = !aliasMatches(darkExisting, slot.aliasTargetName);
    const lightChanged = !aliasMatches(lightExisting, slot.aliasTargetName);
    if (darkChanged || lightChanged || codeSyntaxChanged) {
      ops.updates.push({ slot, darkChanged, lightChanged, codeSyntaxChanged });
    }
    continue;
  }

  // scale-step or float — diff raw values per mode
  const darkExisting = existing.valuesByMode[snapshotDarkModeId];
  const lightExisting = existing.valuesByMode[snapshotLightModeId];
  const eq = slot.type === "COLOR" ? colorEqual : floatEqual;
  const darkChanged = !eq(slot.dark, darkExisting);
  const lightChanged = !eq(slot.light, lightExisting);

  if (darkChanged || lightChanged || codeSyntaxChanged) {
    ops.updates.push({ slot, darkChanged, lightChanged, codeSyntaxChanged });
  }
}

if (state) {
  for (const v of snapshotByName.values()) {
    if (!desired.has(v.name)) ops.removes.push(v);
  }
}

// Within creates, scale steps must come before aliases (so the alias targets
// exist by the time alias creation runs). Floats can land anywhere.
function sortKey(slot) {
  if (slot.kind === "scale-step") return 0;
  if (slot.kind === "float") return 1;
  if (slot.kind === "alias") return 2;
  return 3;
}
ops.creates.sort((a, b) => sortKey(a) - sortKey(b) || a.name.localeCompare(b.name));
// Updates: convert-to-alias updates also need scale targets to exist. Same order.
ops.updates.sort((a, b) => sortKey(a.slot) - sortKey(b.slot) || a.slot.name.localeCompare(b.slot.name));

// ─────────────────────────────────────────────────────────────────────────
// 4. Emit the Plugin-API JS patch.
// ─────────────────────────────────────────────────────────────────────────

function safeId(name) {
  return name.replace(/[^a-zA-Z0-9]/g, "_");
}

function emit() {
  const lines = [];
  lines.push("// AUTO-GENERATED by scripts/push-figma-tokens.mjs from DESIGN.md.");
  lines.push("// Paste this entire file into a Figma Plugin-API runner (e.g. use_figma) and run.");
  lines.push("// After running, re-export the file's variables and overwrite .figma/figma-state.json.");
  lines.push(`// Collection: "${COLLECTION_NAME}"`);
  lines.push("");
  lines.push("const colls = await figma.variables.getLocalVariableCollectionsAsync();");
  lines.push(`let coll = colls.find(c => c.name === ${JSON.stringify(COLLECTION_NAME)});`);
  lines.push("if (!coll) {");
  lines.push(`  coll = figma.variables.createVariableCollection(${JSON.stringify(COLLECTION_NAME)});`);
  lines.push("  coll.renameMode(coll.modes[0].modeId, \"Dark\");");
  lines.push("  coll.addMode(\"Light\");");
  lines.push("}");
  lines.push("const dark = coll.modes.find(m => m.name === \"Dark\");");
  lines.push("const light = coll.modes.find(m => m.name === \"Light\");");
  lines.push("if (!dark) throw new Error('Mode \"Dark\" missing from collection');");
  lines.push("if (!light) throw new Error('Mode \"Light\" missing from collection');");
  lines.push("");
  lines.push("const allIds = coll.variableIds;");
  lines.push("const all = await Promise.all(allIds.map(id => figma.variables.getVariableByIdAsync(id)));");
  lines.push("const byName = new Map(all.map(v => [v.name, v]));");
  lines.push("");
  lines.push("function getOrThrow(name) {");
  lines.push("  const v = byName.get(name);");
  lines.push("  if (!v) throw new Error('Variable not found in collection (alias target may not have been created yet): ' + name);");
  lines.push("  return v;");
  lines.push("}");
  lines.push("");
  lines.push("const log = { created: [], updated: [], skipped: [] };");
  lines.push("");

  // ── creates ──────────────────────────────────────────────────────────
  for (const slot of ops.creates) {
    lines.push(`// CREATE ${slot.name}  (${slot.kind})`);
    lines.push(`{`);
    lines.push(`  const v = figma.variables.createVariable(${JSON.stringify(slot.name)}, coll, ${JSON.stringify(slot.type)});`);
    lines.push(`  v.scopes = ${JSON.stringify(slot.scopes)};`);
    lines.push(`  v.setVariableCodeSyntax("WEB", ${JSON.stringify(`var(--${slot.cssVar})`)});`);
    lines.push(`  v.description = ${JSON.stringify(slot.description)};`);
    if (slot.kind === "alias") {
      lines.push(`  const target = getOrThrow(${JSON.stringify(slot.aliasTargetName)});`);
      lines.push(`  v.setValueForMode(dark.modeId, { type: "VARIABLE_ALIAS", id: target.id });`);
      lines.push(`  v.setValueForMode(light.modeId, { type: "VARIABLE_ALIAS", id: target.id });`);
    } else {
      lines.push(`  v.setValueForMode(dark.modeId, ${JSON.stringify(slot.dark)});`);
      lines.push(`  v.setValueForMode(light.modeId, ${JSON.stringify(slot.light)});`);
    }
    lines.push(`  byName.set(${JSON.stringify(slot.name)}, v);`);
    lines.push(`  log.created.push(${JSON.stringify(slot.name)});`);
    lines.push(`}`);
    lines.push("");
  }

  // ── updates ──────────────────────────────────────────────────────────
  for (const op of ops.updates) {
    const slot = op.slot;
    lines.push(`// UPDATE ${slot.name}  (${slot.kind})`);
    lines.push(`{`);
    lines.push(`  const v = byName.get(${JSON.stringify(slot.name)});`);
    lines.push(`  if (!v) throw new Error('Snapshot drift: ${slot.name} not found in Figma');`);
    if (slot.kind === "alias") {
      // Conversions land here too (raw COLOR → alias). Always re-set both modes
      // to be safe.
      if (op.darkChanged || op.lightChanged) {
        lines.push(`  const target = getOrThrow(${JSON.stringify(slot.aliasTargetName)});`);
        if (op.darkChanged)  lines.push(`  v.setValueForMode(dark.modeId, { type: "VARIABLE_ALIAS", id: target.id });`);
        if (op.lightChanged) lines.push(`  v.setValueForMode(light.modeId, { type: "VARIABLE_ALIAS", id: target.id });`);
      }
    } else {
      if (op.darkChanged)  lines.push(`  v.setValueForMode(dark.modeId, ${JSON.stringify(slot.dark)});`);
      if (op.lightChanged) lines.push(`  v.setValueForMode(light.modeId, ${JSON.stringify(slot.light)});`);
    }
    if (op.codeSyntaxChanged) lines.push(`  v.setVariableCodeSyntax("WEB", ${JSON.stringify(`var(--${slot.cssVar})`)});`);
    lines.push(`  log.updated.push(${JSON.stringify(slot.name)});`);
    lines.push(`}`);
    lines.push("");
  }

  // ── removes ─ destructive, commented out by default ──────────────────
  if (ops.removes.length > 0) {
    lines.push("// ⚠ REMOVALS — destructive. Uncomment after confirming intent.");
    lines.push("// These variables are present in Figma but absent from DESIGN.md.");
    lines.push("// If they should be deleted, uncomment the corresponding lines.");
    lines.push("// If they should stay, add the matching token to DESIGN.md and re-run push.");
    lines.push("");
    for (const v of ops.removes) {
      const id = `remove_${safeId(v.name)}`;
      lines.push(`// const ${id} = byName.get(${JSON.stringify(v.name)});`);
      lines.push(`// if (${id}) ${id}.remove();`);
      lines.push(`// log.skipped.push("removed: ${v.name}");`);
      lines.push("");
    }
  }

  lines.push("return log;");
  return lines.join("\n");
}

const patch = emit();

// ─────────────────────────────────────────────────────────────────────────
// 5. Output.
// ─────────────────────────────────────────────────────────────────────────

const summary = {
  creates: ops.creates.length,
  updates: ops.updates.length,
  removes: ops.removes.length,
};

if (stdout) {
  process.stdout.write(patch);
} else {
  writeFileSync(outputPath, patch);
  console.log(`✓ wrote ${relative(ROOT, outputPath)}`);
  console.log(`  ${summary.creates} create${summary.creates === 1 ? "" : "s"} · ${summary.updates} update${summary.updates === 1 ? "" : "s"} · ${summary.removes} removal${summary.removes === 1 ? "" : "s"} (commented out)`);
  if (summary.creates + summary.updates === 0 && summary.removes === 0) {
    console.log("  Figma snapshot already in sync with DESIGN.md. Patch is a no-op.");
  } else {
    console.log("  Next: open Figma, run the patch via use_figma, then refresh .figma/figma-state.json.");
  }
}
