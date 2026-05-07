import { BREAKPOINTS, type BreakpointKey, mediaQueryFor } from "@shared/constants";
import { renderInstructionsMarkdown } from "@shared/patch-instructions";
import type {
  Edit,
  Patch,
  PatchEdit,
  PatchMediaBlock,
  PropertyChange,
  StylingSystem,
} from "@shared/types";
import { tailwindHintFor } from "./tailwind-hint";

interface BuildArgs {
  url: string;
  stylingSystem: StylingSystem;
  edits: Edit[];
}

type MediaBreakpoint = Exclude<BreakpointKey, "desktop">;

const MEDIA_BREAKPOINT_ORDER = ["tablet", "mobile"] as const satisfies readonly MediaBreakpoint[];

// Compile-time guard: errors here if a new MediaBreakpoint is added without
// being appended to MEDIA_BREAKPOINT_ORDER above.
const _exhaustiveMediaOrder: Exclude<
  MediaBreakpoint,
  (typeof MEDIA_BREAKPOINT_ORDER)[number]
> extends never
  ? true
  : never = true;
void _exhaustiveMediaOrder;

function hasMediaBreakpoint(bp: BreakpointKey): bp is MediaBreakpoint {
  return bp !== "desktop";
}

function withPatchMetadata(change: PropertyChange, stylingSystem: StylingSystem): PropertyChange {
  return {
    ...change,
    tailwindHint: stylingSystem === "tailwind" ? tailwindHintFor(change.property, change.to) : null,
    mediaQuery: mediaQueryFor(change.breakpoint),
  };
}

function buildMediaBlocks(changes: PropertyChange[]): PatchMediaBlock[] {
  const byBreakpoint: Record<MediaBreakpoint, PropertyChange[]> = {
    tablet: [],
    mobile: [],
  };

  for (const change of changes) {
    if (!hasMediaBreakpoint(change.breakpoint)) continue;
    byBreakpoint[change.breakpoint].push(change);
  }

  return MEDIA_BREAKPOINT_ORDER.flatMap((breakpoint) => {
    const breakpointChanges = byBreakpoint[breakpoint];
    if (breakpointChanges.length === 0) return [];

    return [{ breakpoint, query: mediaQueryFor(breakpoint), changes: breakpointChanges }];
  });
}

export function buildPatch({ url, stylingSystem, edits }: BuildArgs): Patch {
  const patchEdits: PatchEdit[] = edits
    .filter((e) => e.changes.length > 0)
    .map((e) => {
      const changes = e.changes.map((c) => withPatchMetadata(c, stylingSystem));
      const media = buildMediaBlocks(changes);

      return {
        siblingGroup: e.siblingGroup,
        element: {
          tag: e.element.tag,
          text: e.element.text,
          role: e.element.role,
          ariaLabel: e.element.ariaLabel,
          selectors: e.element.selectors,
          domPath: e.element.domPath,
        },
        changes,
        ...(media.length > 0 ? { media } : {}),
      };
    });

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
