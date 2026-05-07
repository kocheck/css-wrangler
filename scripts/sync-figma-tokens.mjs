#!/usr/bin/env node
/**
 * sync-figma-tokens.mjs
 *
 * (Reverse path: Figma → DESIGN.md.)
 *
 * # Status: paused under the Radix-scale schema
 *
 * Color values in DESIGN.md no longer carry hex literals. They're declared
 * by `colorScales:` (which Radix scales to import) and `colorAliases:`
 * (semantic-name → scale.step). The hex values themselves come from
 * @radix-ui/colors at codegen time.
 *
 * That makes the legacy "tweak a hex in Figma, pull it back into DESIGN.md"
 * flow ambiguous:
 *
 *   - If a designer changes `sand/3` in Figma to a different hex, that's a
 *     divergence from Radix — pulling it would silently break the
 *     contrast guarantees Radix engineered. We don't want to support that
 *     by default.
 *
 *   - If a designer wants to remap an alias (e.g. fg-secondary → sand.10
 *     instead of sand.11), Figma's variable aliases capture this naturally,
 *     but parsing a snapshot back into a `colorAliases.fg-secondary:
 *     sand.10` line is a non-trivial walk that this script doesn't yet
 *     implement.
 *
 * Until those decisions are made, this script exits with an error rather
 * than silently emit wrong YAML. The forward path (DESIGN.md → Figma) and
 * the verify gate (DESIGN.md ↔ snapshot) both work — see
 * push-figma-tokens.mjs and check-figma-sync.mjs.
 *
 * EXPORT_SNIPPET below is unchanged — push and check still need it to
 * read the snapshot.
 */

console.error("✗ tokens:pull is paused under the Radix-scale schema.");
console.error("");
console.error("  Color values come from @radix-ui/colors, not Figma. Pulling Figma");
console.error("  hexes back into DESIGN.md would override the Radix-engineered scale");
console.error("  values and silently break the AA contrast guarantees.");
console.error("");
console.error("  To intentionally change a token:");
console.error("    - Different scale (red instead of tomato): edit colorScales in DESIGN.md.");
console.error("    - Different step (sand.10 instead of sand.11): edit colorAliases in DESIGN.md.");
console.error("    - Upgrade Radix:  pnpm update @radix-ui/colors  (then pnpm tokens && pnpm tokens:push).");
console.error("");
console.error("  Snapshot refresh (after push) still uses EXPORT_SNIPPET — see the");
console.error("  comment at the bottom of this file.");
process.exit(1);

/**
 * EXPORT_SNIPPET — paste into a use_figma / Plugin-API tool to dump the
 * variable collection. Save the returned JSON to .figma/figma-state.json.
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
