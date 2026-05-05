// Default token values mirror tokens.css (auto-generated from DESIGN.md).
// Editing here lets the playground show "what changed" deltas for export,
// but the canonical source remains DESIGN.md → pnpm tokens.

interface TokenBase {
  name: string;
  cssVar: string;
  yamlPath: string;
  description?: string;
}

type ColorToken = TokenBase & {
  kind: "color";
  group: "color-fg" | "color-bg" | "color-border" | "color-accent";
  default: `#${string}`;
};

type LengthToken = TokenBase & {
  kind: "length";
  group: "type" | "spacing" | "rounded";
  default: `${number}px`;
};

type DurationToken = TokenBase & {
  kind: "duration";
  group: "motion";
  default: `${number}ms`;
};

type RatioToken = TokenBase & {
  kind: "ratio";
  group: "leading";
  default: string;
};

type StringToken = TokenBase & {
  kind: "string";
  group: "tracking" | "ease";
  default: string;
};

export type TokenDef = ColorToken | LengthToken | DurationToken | RatioToken | StringToken;
export type TokenKind = TokenDef["kind"];

export const TOKENS = [
  // Foreground
  {
    name: "fg-primary",
    cssVar: "--fg-primary",
    yamlPath: "colors.fg-primary",
    kind: "color",
    group: "color-fg",
    default: "#fafaf7",
    description: "Body text · headlines",
  },
  {
    name: "fg-secondary",
    cssVar: "--fg-secondary",
    yamlPath: "colors.fg-secondary",
    kind: "color",
    group: "color-fg",
    default: "#a8a8a3",
    description: "Captions · metadata",
  },
  {
    name: "fg-tertiary",
    cssVar: "--fg-tertiary",
    yamlPath: "colors.fg-tertiary",
    kind: "color",
    group: "color-fg",
    default: "#6a6a66",
    description: "Hints · placeholders",
  },
  {
    name: "fg-quaternary",
    cssVar: "--fg-quaternary",
    yamlPath: "colors.fg-quaternary",
    kind: "color",
    group: "color-fg",
    default: "#3d3d3a",
    description: "Disabled · empty",
  },

  // Background
  {
    name: "bg-page",
    cssVar: "--bg-page",
    yamlPath: "colors.bg-page",
    kind: "color",
    group: "color-bg",
    default: "#0e0e10",
    description: "App ground",
  },
  {
    name: "bg-elev-1",
    cssVar: "--bg-elev-1",
    yamlPath: "colors.bg-elev-1",
    kind: "color",
    group: "color-bg",
    default: "#131316",
    description: "Cards",
  },
  {
    name: "bg-elev-2",
    cssVar: "--bg-elev-2",
    yamlPath: "colors.bg-elev-2",
    kind: "color",
    group: "color-bg",
    default: "#1a1a1e",
    description: "Card body, expanded",
  },
  {
    name: "bg-elev-3",
    cssVar: "--bg-elev-3",
    yamlPath: "colors.bg-elev-3",
    kind: "color",
    group: "color-bg",
    default: "#232328",
    description: "Inputs",
  },

  // Borders
  {
    name: "border-hairline",
    cssVar: "--border-hairline",
    yamlPath: "colors.border-hairline",
    kind: "color",
    group: "color-border",
    default: "#2a2a2e",
    description: "Dividers · only divider",
  },
  {
    name: "border-strong",
    cssVar: "--border-strong",
    yamlPath: "colors.border-strong",
    kind: "color",
    group: "color-border",
    default: "#3d3d42",
    description: "Emphasized borders",
  },

  // Accents
  {
    name: "accent-signal",
    cssVar: "--accent-signal",
    yamlPath: "colors.accent-signal",
    kind: "color",
    group: "color-accent",
    default: "#ff3d00",
    description: "PICK · destructive · live",
  },
  {
    name: "accent-signal-dim",
    cssVar: "--accent-signal-dim",
    yamlPath: "colors.accent-signal-dim",
    kind: "color",
    group: "color-accent",
    default: "#b32a00",
    description: "Hover state of signal",
  },
  {
    name: "accent-applied",
    cssVar: "--accent-applied",
    yamlPath: "colors.accent-applied",
    kind: "color",
    group: "color-accent",
    default: "#7ae582",
    description: "Synced · copy success",
  },
  {
    name: "accent-diverges",
    cssVar: "--accent-diverges",
    yamlPath: "colors.accent-diverges",
    kind: "color",
    group: "color-accent",
    default: "#ffb800",
    description: "Off-scale token warning",
  },

  // Type sizes
  {
    name: "type-micro",
    cssVar: "--type-micro",
    yamlPath: "type.micro",
    kind: "length",
    group: "type",
    default: "9px",
  },
  {
    name: "type-caption",
    cssVar: "--type-caption",
    yamlPath: "type.caption",
    kind: "length",
    group: "type",
    default: "10px",
  },
  {
    name: "type-body",
    cssVar: "--type-body",
    yamlPath: "type.body",
    kind: "length",
    group: "type",
    default: "11px",
  },
  {
    name: "type-label",
    cssVar: "--type-label",
    yamlPath: "type.label",
    kind: "length",
    group: "type",
    default: "11px",
  },
  {
    name: "type-data",
    cssVar: "--type-data",
    yamlPath: "type.data",
    kind: "length",
    group: "type",
    default: "12px",
  },
  {
    name: "type-display",
    cssVar: "--type-display",
    yamlPath: "type.display",
    kind: "length",
    group: "type",
    default: "13px",
  },
  {
    name: "type-section",
    cssVar: "--type-section",
    yamlPath: "type.section",
    kind: "length",
    group: "type",
    default: "10px",
  },
  {
    name: "type-headline-sm",
    cssVar: "--type-headline-sm",
    yamlPath: "type.headline-sm",
    kind: "length",
    group: "type",
    default: "24px",
  },
  {
    name: "type-headline-lg",
    cssVar: "--type-headline-lg",
    yamlPath: "type.headline-lg",
    kind: "length",
    group: "type",
    default: "32px",
  },

  // Tracking
  {
    name: "tracking-tight",
    cssVar: "--tracking-tight",
    yamlPath: "tracking.tight",
    kind: "string",
    group: "tracking",
    default: "-0.01em",
  },
  {
    name: "tracking-normal",
    cssVar: "--tracking-normal",
    yamlPath: "tracking.normal",
    kind: "string",
    group: "tracking",
    default: "0",
  },
  {
    name: "tracking-wide",
    cssVar: "--tracking-wide",
    yamlPath: "tracking.wide",
    kind: "string",
    group: "tracking",
    default: "0.04em",
  },
  {
    name: "tracking-caps",
    cssVar: "--tracking-caps",
    yamlPath: "tracking.caps",
    kind: "string",
    group: "tracking",
    default: "0.08em",
  },

  // Leading
  {
    name: "leading-tight",
    cssVar: "--leading-tight",
    yamlPath: "leading.tight",
    kind: "ratio",
    group: "leading",
    default: "1.2",
  },
  {
    name: "leading-normal",
    cssVar: "--leading-normal",
    yamlPath: "leading.normal",
    kind: "ratio",
    group: "leading",
    default: "1.4",
  },

  // Spacing
  {
    name: "sp-1",
    cssVar: "--sp-1",
    yamlPath: "spacing.1",
    kind: "length",
    group: "spacing",
    default: "2px",
  },
  {
    name: "sp-2",
    cssVar: "--sp-2",
    yamlPath: "spacing.2",
    kind: "length",
    group: "spacing",
    default: "4px",
  },
  {
    name: "sp-3",
    cssVar: "--sp-3",
    yamlPath: "spacing.3",
    kind: "length",
    group: "spacing",
    default: "6px",
  },
  {
    name: "sp-4",
    cssVar: "--sp-4",
    yamlPath: "spacing.4",
    kind: "length",
    group: "spacing",
    default: "8px",
  },
  {
    name: "sp-5",
    cssVar: "--sp-5",
    yamlPath: "spacing.5",
    kind: "length",
    group: "spacing",
    default: "12px",
  },
  {
    name: "sp-6",
    cssVar: "--sp-6",
    yamlPath: "spacing.6",
    kind: "length",
    group: "spacing",
    default: "16px",
  },
  {
    name: "sp-7",
    cssVar: "--sp-7",
    yamlPath: "spacing.7",
    kind: "length",
    group: "spacing",
    default: "20px",
  },
  {
    name: "sp-8",
    cssVar: "--sp-8",
    yamlPath: "spacing.8",
    kind: "length",
    group: "spacing",
    default: "24px",
  },
  {
    name: "sp-9",
    cssVar: "--sp-9",
    yamlPath: "spacing.9",
    kind: "length",
    group: "spacing",
    default: "32px",
  },

  // Radius
  {
    name: "radius-sm",
    cssVar: "--radius-sm",
    yamlPath: "rounded.sm",
    kind: "length",
    group: "rounded",
    default: "1px",
  },
  {
    name: "radius-md",
    cssVar: "--radius-md",
    yamlPath: "rounded.md",
    kind: "length",
    group: "rounded",
    default: "2px",
  },

  // Motion
  {
    name: "motion-fast",
    cssVar: "--motion-fast",
    yamlPath: "motion.fast",
    kind: "duration",
    group: "motion",
    default: "60ms",
  },
  {
    name: "motion-base",
    cssVar: "--motion-base",
    yamlPath: "motion.base",
    kind: "duration",
    group: "motion",
    default: "120ms",
  },
  {
    name: "motion-slow",
    cssVar: "--motion-slow",
    yamlPath: "motion.slow",
    kind: "duration",
    group: "motion",
    default: "220ms",
  },

  // Ease
  {
    name: "ease-instrument",
    cssVar: "--ease-instrument",
    yamlPath: "ease.instrument",
    kind: "string",
    group: "ease",
    default: "cubic-bezier(0.2, 0, 0, 1)",
  },
] as const satisfies readonly TokenDef[];

export type TokenCssVar = (typeof TOKENS)[number]["cssVar"];

// `Record<string, …>` is intentional here — consumers iterate `Object.entries`
// over user-edited overrides, which makes literal typing fight ergonomics.
// Persistence-layer safety lives in `isKnownTokenVar` (used to drop stale
// localStorage keys on hydration).
export const TOKEN_BY_VAR: Record<string, TokenDef> = Object.fromEntries(
  TOKENS.map((t) => [t.cssVar, t]),
);

export function isKnownTokenVar(cssVar: string): cssVar is TokenCssVar {
  return cssVar in TOKEN_BY_VAR;
}

export type TokenOverrides = Record<string, string>;
