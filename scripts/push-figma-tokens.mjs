#!/usr/bin/env node
/**
 * push-figma-tokens.mjs
 *
 * DESIGN.md → Figma direction. Generates a self-contained Plugin-API JS
 * snippet that, when pasted into a Figma `use_figma`-style runner, will
 * upsert every variable in `CSS Wrangler / Tokens` to match the
 * frontmatter in DESIGN.md.
 *
 * The file we generate is itself executable Plugin-API JS — the designer
 * pastes its contents into Figma and runs it. CI also reads this file (or
 * the snapshot it produces post-run) to verify drift.
 *
 * Workflow:
 *   1. Edit DESIGN.md (or pull from Figma via `pnpm tokens:pull`).
 *   2. Run `pnpm tokens` to regenerate tokens.css.
 *   3. Run `pnpm tokens:push` — writes `.figma/push-patch.js`.
 *   4. Open Figma → paste `.figma/push-patch.js` into a Plugin-API runner.
 *   5. Run the EXPORT_SNIPPET in Figma → save to `.figma/figma-state.json`.
 *   6. `pnpm tokens:check-figma` should now pass.
 *   7. Commit DESIGN.md + tokens.css + .figma/push-patch.js + .figma/figma-state.json.
 *
 * Add/update/remove semantics:
 *   - Add (DESIGN.md has a key that's not in Figma): patch creates the
 *     variable with codeSyntax, description, scopes.
 *   - Update (both sides have the key, values differ): patch sets the new
 *     valueByMode for Dark and (for fg/bg/border) Light.
 *   - Remove (Figma has a variable that's not in DESIGN.md): patch
 *     COMMENTS OUT the deleteVariable call and warns the designer to
 *     confirm — destructive operations require a manual uncomment.
 *
 * Flags:
 *   --output <path>  Destination for the patch JS. Defaults to .figma/push-patch.js.
 *   --stdout         Print to stdout instead of writing a file.
 *   --state <path>   Read Figma's current state from a snapshot file. Defaults
 *                    to .figma/figma-state.json. Used to compute the diff so the
 *                    generated patch is minimal (skips no-op writes).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
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
// Figma model: one variable per token; valuesByMode keys for Dark + Light.
// Colors with a colorsLight pair have separate Light values; everything else
// uses the same value across both modes.

const desired = new Map(); // figmaName → { type, name, scopes, codeSyntax, description, dark, light }

function ensure(name, builder) {
  if (!desired.has(name)) desired.set(name, builder());
  return desired.get(name);
}

function scopesFor(figmaName) {
  if (figmaName.startsWith("fg/")) return ["TEXT_FILL"];
  if (figmaName.startsWith("bg/")) return ["FRAME_FILL", "SHAPE_FILL"];
  if (figmaName.startsWith("border/")) return ["STROKE_COLOR"];
  if (figmaName.startsWith("accent/")) return ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
  if (figmaName.startsWith("sp/")) return ["GAP", "WIDTH_HEIGHT"];
  if (figmaName.startsWith("radius/")) return ["CORNER_RADIUS"];
  if (figmaName.startsWith("type/")) return ["FONT_SIZE"];
  if (figmaName.startsWith("tracking/")) return ["LETTER_SPACING"];
  if (figmaName.startsWith("leading/")) return ["LINE_HEIGHT"];
  return ["ALL_SCOPES"];
}

function descriptionFor(section, key, hasLight) {
  const lightNote = hasLight ? ` · light: colorsLight.${key}` : "";
  return `DESIGN.md · ${section}.${key}${lightNote}`;
}

const parseErrors = [];

for (const { section, key, value } of iterateDesignTokens(fm)) {
  const figmaName = designKeyToFigmaName(section, key);
  if (!figmaName) continue;
  const parsed = parseDesignValue(section, key, value);
  if (!parsed) {
    parseErrors.push(`${section}.${key} = ${JSON.stringify(value)}`);
    continue;
  }

  const isLightOnly = section === "colorsLight";

  const slot = ensure(figmaName, () => ({
    name: figmaName,
    type: parsed.type,
    scopes: scopesFor(figmaName),
    cssVar: figmaName.replace("/", "-"),
    description: descriptionFor(
      isLightOnly ? "colors" : section,
      key,
      // hasLight is true for fg/bg/border (which carry colorsLight overrides)
      figmaName.startsWith("fg/") || figmaName.startsWith("bg/") || figmaName.startsWith("border/"),
    ),
    dark: null,
    light: null,
  }));

  if (isLightOnly) {
    if (slot.dark === null) {
      throw new Error(
        `colorsLight.${key} appears without a matching colors.${key}. ` +
          `Add the dark-mode value first, or remove the orphan from colorsLight.`,
      );
    }
    slot.light = parsed.value;
  } else {
    slot.dark = parsed.value;
    // For accents and non-color tokens, light mirrors dark (mode-agnostic).
    if (!figmaName.startsWith("fg/") && !figmaName.startsWith("bg/") && !figmaName.startsWith("border/")) {
      slot.light = parsed.value;
    }
  }
}

if (parseErrors.length > 0) {
  console.error(`✗ ${parseErrors.length} DESIGN.md value${parseErrors.length === 1 ? "" : "s"} could not be parsed:`);
  for (const e of parseErrors) console.error(`  ${e}`);
  console.error("  Fix the frontmatter and re-run. The patch was not generated.");
  process.exit(1);
}

// Backfill any color whose colorsLight entry is missing — it should mirror
// dark. (DESIGN.md has paired colorsLight for fg/bg/border, but if a key is
// missed, fall back rather than emit a broken patch.)
for (const slot of desired.values()) {
  if (slot.type === "COLOR" && slot.light === null) slot.light = slot.dark;
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Diff against the snapshot to compute add / update / remove.
// ─────────────────────────────────────────────────────────────────────────

const ops = { creates: [], updates: [], removes: [] };

const snapshotByName = new Map();
if (state) {
  for (const v of Object.values(state.meta.variables)) {
    snapshotByName.set(v.name, v);
  }
}
const snapshotCollection = state
  ? Object.values(state.meta.variableCollections).find((c) => c.name === COLLECTION_NAME)
  : null;
const snapshotDarkModeId = snapshotCollection?.modes.find((m) => m.name === "Dark")?.modeId;
const snapshotLightModeId = snapshotCollection?.modes.find((m) => m.name === "Light")?.modeId;

function colorEqual(a, b) {
  // Figma's stored values have float precision; compare to 8-bit rounding.
  if (!a || !b) return false;
  const eq = (x, y) => Math.round(x * 255) === Math.round(y * 255);
  return eq(a.r, b.r) && eq(a.g, b.g) && eq(a.b, b.b);
}
function floatEqual(a, b) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.001;
}

for (const slot of desired.values()) {
  const existing = snapshotByName.get(slot.name);
  if (!existing) {
    ops.creates.push(slot);
    continue;
  }
  const darkExisting = existing.valuesByMode[snapshotDarkModeId];
  const lightExisting = existing.valuesByMode[snapshotLightModeId];

  const eq = slot.type === "COLOR" ? colorEqual : floatEqual;
  const darkChanged = !eq(slot.dark, darkExisting);
  const lightChanged = slot.light != null && lightExisting != null && !eq(slot.light, lightExisting);
  const codeSyntaxChanged = existing.codeSyntax?.WEB !== `var(--${slot.cssVar})`;
  // Description is not part of the diff: designers may add notes to variables
  // in Figma, and overwriting them on every push would silently destroy that work.
  // Descriptions are still set on CREATE so new tokens land with a useful default.

  if (darkChanged || lightChanged || codeSyntaxChanged) {
    ops.updates.push({ slot, darkChanged, lightChanged, codeSyntaxChanged, existingId: existing.id });
  }
}

if (state) {
  for (const v of Object.values(state.meta.variables)) {
    if (!desired.has(v.name)) ops.removes.push(v);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Emit the Plugin-API JS patch.
// ─────────────────────────────────────────────────────────────────────────

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
  lines.push("const log = { created: [], updated: [], skipped: [] };");
  lines.push("");

  // creates
  for (const slot of ops.creates) {
    lines.push(`// CREATE ${slot.name}`);
    lines.push(`{`);
    lines.push(`  const v = figma.variables.createVariable(${JSON.stringify(slot.name)}, coll, ${JSON.stringify(slot.type)});`);
    lines.push(`  v.scopes = ${JSON.stringify(slot.scopes)};`);
    lines.push(`  v.setVariableCodeSyntax("WEB", ${JSON.stringify(`var(--${slot.cssVar})`)});`);
    lines.push(`  v.description = ${JSON.stringify(slot.description)};`);
    lines.push(`  v.setValueForMode(dark.modeId, ${JSON.stringify(slot.dark)});`);
    lines.push(`  v.setValueForMode(light.modeId, ${JSON.stringify(slot.light)});`);
    lines.push(`  log.created.push(${JSON.stringify(slot.name)});`);
    lines.push(`}`);
    lines.push("");
  }

  // updates
  for (const op of ops.updates) {
    const slot = op.slot;
    lines.push(`// UPDATE ${slot.name}`);
    lines.push(`{`);
    lines.push(`  const v = byName.get(${JSON.stringify(slot.name)});`);
    lines.push(`  if (!v) throw new Error('Snapshot drift: ${slot.name} not found in Figma');`);
    if (op.darkChanged)        lines.push(`  v.setValueForMode(dark.modeId, ${JSON.stringify(slot.dark)});`);
    if (op.lightChanged)       lines.push(`  v.setValueForMode(light.modeId, ${JSON.stringify(slot.light)});`);
    if (op.codeSyntaxChanged)  lines.push(`  v.setVariableCodeSyntax("WEB", ${JSON.stringify(`var(--${slot.cssVar})`)});`);
    lines.push(`  log.updated.push(${JSON.stringify(slot.name)});`);
    lines.push(`}`);
    lines.push("");
  }

  // removes — destructive, commented out by default
  if (ops.removes.length > 0) {
    lines.push("// ⚠ REMOVALS — destructive. Uncomment after confirming intent.");
    lines.push("// These variables are present in Figma but absent from DESIGN.md.");
    lines.push("// If they should be deleted, uncomment the corresponding lines.");
    lines.push("// If they should stay, add the matching token to DESIGN.md and re-run push.");
    lines.push("");
    for (const v of ops.removes) {
      lines.push(`// const remove_${v.name.replace(/[^a-zA-Z0-9]/g, "_")} = byName.get(${JSON.stringify(v.name)});`);
      lines.push(`// if (remove_${v.name.replace(/[^a-zA-Z0-9]/g, "_")}) remove_${v.name.replace(/[^a-zA-Z0-9]/g, "_")}.remove();`);
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
    console.log("  Next: open Figma, paste the patch into a Plugin-API runner, then refresh .figma/figma-state.json.");
  }
}
