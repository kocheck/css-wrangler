import { BREAKPOINTS } from "@shared/constants";
import type { Edit, Patch, PatchEdit, StylingSystem } from "@shared/types";
import { tailwindHintFor } from "./tailwind-hint";

interface BuildArgs {
  url: string;
  stylingSystem: StylingSystem;
  edits: Edit[];
}

export function buildPatch({ url, stylingSystem, edits }: BuildArgs): Patch {
  const patchEdits: PatchEdit[] = edits
    .filter((e) => e.changes.length > 0)
    .map((e) => ({
      siblingGroup: e.siblingGroup,
      element: {
        tag: e.element.tag,
        text: e.element.text,
        role: e.element.role,
        ariaLabel: e.element.ariaLabel,
        selectors: e.element.selectors,
        domPath: e.element.domPath,
      },
      changes: e.changes.map((c) => ({
        ...c,
        tailwindHint: stylingSystem === "tailwind" ? tailwindHintFor(c.property, c.to) : null,
      })),
    }));

  return {
    version: "1.0",
    source: "css-wrangler",
    url,
    capturedAt: new Date().toISOString(),
    stylingSystem,
    breakpoints: { ...BREAKPOINTS },
    edits: patchEdits,
  };
}

const HEADER_TEMPLATE = (url: string, capturedAt: string) => `# CSS Wrangler Patch
# Source: ${url}
# Captured: ${capturedAt}

## Instructions for Claude Code

Run \`/frontend-skill\` to handle this patch. Apply each edit to the source CSS
files directly (not inline styles, not new wrapper components).

For each element:
1. Try selectors in stability order until you find a match in the codebase.
2. Look for a \`DESIGN.md\`, \`design-tokens.{ts,js,json}\`, or equivalent design
   system reference. If found, prefer existing tokens over raw values.
3. Apply DRY aggressively. If the value matches an existing token, use the
   token. If similar values are repeated across edits, propose a new token.
4. **Honor \`siblingGroup\`**: edits sharing a \`siblingGroup\` ID should be
   applied as a single source change (e.g., updating a shared class) rather
   than N duplicate edits.
5. **If a change breaks the design system** (one-off color, spacing outside
   the scale, non-standard radius), STOP and ask:
   - "This change adds [specific deviation]. Apply anyway? Document the
     deviation in DESIGN.md as a noted exception?"
6. For pages flagged \`stylingSystem: "tailwind"\`, prefer the suggested
   Tailwind classes over raw CSS unless the raw value is more accurate.
7. Group \`@media\` rules properly. Don't duplicate selectors across
   breakpoints when consolidation is cleaner.

## Patch
`;

export function buildPatchMarkdown(args: BuildArgs): string {
  const patch = buildPatch(args);
  const header = HEADER_TEMPLATE(patch.url, patch.capturedAt);
  return ["````", header, "```json", JSON.stringify(patch, null, 2), "```", "````", ""].join("\n");
}
