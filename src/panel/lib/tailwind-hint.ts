import type { TierProperty } from "@shared/constants";

const SPACING_SCALE: Record<number, string> = {
  0: "0",
  1: "px",
  2: "0.5",
  4: "1",
  6: "1.5",
  8: "2",
  10: "2.5",
  12: "3",
  14: "3.5",
  16: "4",
  20: "5",
  24: "6",
  28: "7",
  32: "8",
  36: "9",
  40: "10",
  44: "11",
  48: "12",
  56: "14",
  64: "16",
  80: "20",
  96: "24",
};

const RADIUS_MAP: Record<number, string> = {
  0: "rounded-none",
  2: "rounded-sm",
  4: "rounded",
  6: "rounded-md",
  8: "rounded-lg",
  12: "rounded-xl",
  16: "rounded-2xl",
  24: "rounded-3xl",
  9999: "rounded-full",
};

const FONT_SIZE_MAP: Record<number, string> = {
  12: "text-xs",
  14: "text-sm",
  16: "text-base",
  18: "text-lg",
  20: "text-xl",
  24: "text-2xl",
  30: "text-3xl",
  36: "text-4xl",
  48: "text-5xl",
};

const FONT_WEIGHT_MAP: Record<string, string> = {
  "100": "font-thin",
  "200": "font-extralight",
  "300": "font-light",
  "400": "font-normal",
  "500": "font-medium",
  "600": "font-semibold",
  "700": "font-bold",
  "800": "font-extrabold",
  "900": "font-black",
};

const SPACE_PREFIX: Record<string, string> = {
  "padding-top": "pt",
  "padding-right": "pr",
  "padding-bottom": "pb",
  "padding-left": "pl",
  "margin-top": "mt",
  "margin-right": "mr",
  "margin-bottom": "mb",
  "margin-left": "ml",
};

const PX_PATTERN = /^(-?\d*\.?\d+)px$/;

function pxOf(value: string): number | null {
  const match = PX_PATTERN.test(value.trim()) ? value.trim().match(PX_PATTERN) : null;
  return match ? Number(match[1]) : null;
}

export function tailwindHintFor(property: TierProperty, value: string): string | null {
  const v = value.trim();

  if (property === "background-color" || property === "color" || property === "border-color") {
    return null;
  }

  if (property in SPACE_PREFIX) {
    const px = pxOf(v);
    if (px == null) return null;
    const scale = SPACING_SCALE[px];
    return scale != null ? `${SPACE_PREFIX[property]}-${scale}` : null;
  }

  if (property === "gap") {
    const px = pxOf(v);
    if (px == null) return null;
    const scale = SPACING_SCALE[px];
    return scale != null ? `gap-${scale}` : null;
  }

  if (property === "border-radius") {
    const px = pxOf(v);
    if (px == null) return null;
    return RADIUS_MAP[px] ?? null;
  }

  if (property === "font-size") {
    const px = pxOf(v);
    if (px == null) return null;
    return FONT_SIZE_MAP[px] ?? null;
  }

  if (property === "font-weight") {
    return FONT_WEIGHT_MAP[v] ?? null;
  }

  if (property === "display") {
    if (v === "flex") return "flex";
    if (v === "grid") return "grid";
    if (v === "block") return "block";
    if (v === "none") return "hidden";
    if (v === "inline-block") return "inline-block";
    if (v === "inline-flex") return "inline-flex";
    return null;
  }

  return null;
}
