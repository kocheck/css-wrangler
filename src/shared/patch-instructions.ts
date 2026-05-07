/**
 * Single source of truth for the "Instructions for Claude Code" rules.
 *
 * Both the markdown patch header (src/panel/lib/patch.ts) and the
 * `apply-css-changes` MCP prompt (cli/src/mcp/prompts/) import from here.
 * Updating the rules in one place keeps the two consumers from drifting.
 *
 * Each entry is the body of a numbered rule (no leading number). The renderer
 * adds `1. `, `2. `, … prefixes. Continuation lines inside a rule are
 * pre-indented with 3 spaces so they align with the text after the prefix.
 */

export const INSTRUCTIONS_INTRO =
  "Run `/frontend-skill` to handle this patch. Apply each edit to the source CSS\nfiles directly (not inline styles, not new wrapper components).";

export const PATCH_INSTRUCTIONS: readonly string[] = [
  "Try selectors in stability order until you find a match in the codebase.",
  `Look for a \`DESIGN.md\`, \`design-tokens.{ts,js,json}\`, or equivalent design
   system reference. If found, prefer existing tokens over raw values.`,
  `Apply DRY aggressively. If the value matches an existing token, use the
   token. If similar values are repeated across edits, propose a new token.`,
  `**Honor \`siblingGroup\`**: edits sharing a \`siblingGroup\` ID should be
   applied as a single source change (e.g., updating a shared class) rather
   than N duplicate edits.`,
  `**If a change breaks the design system** (one-off color, spacing outside
   the scale, non-standard radius), STOP and ask:
   - "This change adds [specific deviation]. Apply anyway? Document the
     deviation in DESIGN.md as a noted exception?"`,
  `For pages flagged \`stylingSystem: "tailwind"\`, prefer the suggested
   Tailwind classes over raw CSS unless the raw value is more accurate.`,
  `When an edit includes a \`media\` array, treat it as the authoritative
   grouping of breakpoint-scoped changes — \`changes\` is still the complete
   list, but the \`media\` blocks tell you which \`@media\` query each
   non-desktop change belongs in. Don't duplicate selectors across
   breakpoints when consolidation is cleaner.`,
];

export function renderInstructionsMarkdown(): string {
  const numbered = PATCH_INSTRUCTIONS.map((rule, i) => `${i + 1}. ${rule}`).join("\n");
  return [
    "## Instructions for Claude Code",
    "",
    INSTRUCTIONS_INTRO,
    "",
    "For each element:",
    numbered,
  ].join("\n");
}
