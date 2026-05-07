import {
  INSTRUCTIONS_INTRO,
  PATCH_INSTRUCTIONS,
  renderInstructionsMarkdown,
} from "@shared/patch-instructions";
import { describe, expect, it } from "vitest";

const EXPECTED = `## Instructions for Claude Code

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
7. When an edit includes a \`media\` array, treat it as the authoritative
   grouping of breakpoint-scoped changes — \`changes\` is still the complete
   list, but the \`media\` blocks tell you which \`@media\` query each
   non-desktop change belongs in. Don't duplicate selectors across
   breakpoints when consolidation is cleaner.`;

describe("renderInstructionsMarkdown", () => {
  it("matches the expected output byte-for-byte", () => {
    expect(renderInstructionsMarkdown()).toBe(EXPECTED);
  });
});

describe("PATCH_INSTRUCTIONS", () => {
  it("has exactly 7 rules", () => {
    expect(PATCH_INSTRUCTIONS.length).toBe(7);
  });

  it("each rule is a non-empty string", () => {
    for (const rule of PATCH_INSTRUCTIONS) {
      expect(typeof rule).toBe("string");
      expect(rule.length).toBeGreaterThan(0);
    }
  });

  it("the siblingGroup rule mentions siblingGroup", () => {
    expect(PATCH_INSTRUCTIONS[3]).toMatch(/siblingGroup/);
  });
});

describe("INSTRUCTIONS_INTRO", () => {
  it("references /frontend-skill", () => {
    expect(INSTRUCTIONS_INTRO).toMatch(/\/frontend-skill/);
  });
});
