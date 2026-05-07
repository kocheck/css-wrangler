import { BREAKPOINTS, mediaQueryFor } from "@shared/constants";
import { renderInstructionsMarkdown } from "@shared/patch-instructions";
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
        mediaQuery: mediaQueryFor(c.breakpoint),
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

${renderInstructionsMarkdown()}

## Patch
`;

export function buildPatchMarkdown(args: BuildArgs): string {
  const patch = buildPatch(args);
  const header = HEADER_TEMPLATE(patch.url, patch.capturedAt);
  return ["````", header, "```json", JSON.stringify(patch, null, 2), "```", "````", ""].join("\n");
}
