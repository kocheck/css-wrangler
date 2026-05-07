import type { BreakpointKey, CssState, TierProperty } from "./constants";

export type SelectorStability = "high" | "medium" | "low";

export type SelectorType = "data-attr" | "id" | "class" | "text" | "path";

export interface SelectorCandidate {
  type: SelectorType;
  value: string;
  stability: SelectorStability;
}

export interface ElementRef {
  /** unique class added to the page element */
  wranglerId: string;
  tag: string;
  text: string | null;
  role: string | null;
  ariaLabel: string | null;
  selectors: SelectorCandidate[];
  /** authoritative DOM path for re-resolution */
  domPath: string;
}

export interface PropertyChange {
  state: CssState;
  breakpoint: BreakpointKey;
  property: TierProperty;
  from: string;
  to: string;
  tailwindHint?: string | null;
  mediaQuery?: string | null;
}

export interface Edit {
  id: string;
  /** group id linking edits applied to similar elements */
  siblingGroup: string | null;
  element: ElementRef;
  /** initial computed styles for the property set, keyed by `${state}|${breakpoint}|${prop}` */
  baseline: Record<string, string>;
  changes: PropertyChange[];
  createdAt: number;
}

export type StylingSystem = "tailwind" | "css-in-js" | "plain";

export interface Patch {
  version: "1.0";
  source: "css-wrangler";
  url: string;
  capturedAt: string;
  stylingSystem: StylingSystem;
  breakpoints: { mobile: number; tablet: number; desktop: number };
  edits: PatchEdit[];
}

export interface PatchEdit {
  siblingGroup: string | null;
  element: {
    tag: string;
    text: string | null;
    role: string | null;
    ariaLabel: string | null;
    selectors: SelectorCandidate[];
    domPath: string;
  };
  changes: PropertyChange[];
}
