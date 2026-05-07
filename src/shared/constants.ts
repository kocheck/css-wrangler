export const STYLE_TAG_ID = "__css-wrangler-styles";
export const WRANGLER_CLASS_PREFIX = "__wrangler-";
export const FORCE_HOVER_CLASS = "__force-hover";
export const FORCE_FOCUS_CLASS = "__force-focus";
export const VIEWPORT_WRAPPER_ID = "__wrangler-viewport";

export const BREAKPOINTS = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export function mediaQueryFor(bp: BreakpointKey): string | null {
  if (bp === "desktop") return null;
  return `@media (max-width: ${BREAKPOINTS[bp]}px)`;
}

export type CssState = "default" | "hover" | "focus";

export const TIER_1_PROPERTIES = [
  // typography
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "color",
  // spacing
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "gap",
  // borders
  "border-radius",
  "border-width",
  "border-color",
  "border-style",
  // background
  "background-color",
  // layout
  "display",
  "width",
  "height",
] as const;

export type TierProperty = (typeof TIER_1_PROPERTIES)[number];

export const PROPERTY_GROUPS = [
  {
    label: "TYPOGRAPHY",
    properties: ["font-size", "font-weight", "line-height", "letter-spacing", "color"] as const,
  },
  {
    label: "SPACING",
    properties: [
      "padding-top",
      "padding-right",
      "padding-bottom",
      "padding-left",
      "margin-top",
      "margin-right",
      "margin-bottom",
      "margin-left",
      "gap",
    ] as const,
  },
  {
    label: "BORDER",
    properties: ["border-radius", "border-width", "border-color", "border-style"] as const,
  },
  {
    label: "BACKGROUND",
    properties: ["background-color"] as const,
  },
  {
    label: "LAYOUT",
    properties: ["display", "width", "height"] as const,
  },
] as const;
