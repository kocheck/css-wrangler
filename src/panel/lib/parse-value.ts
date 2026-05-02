export interface ParsedValue {
  numeric: string;
  unit: string;
}

const NUMERIC_RE = /^(-?\d*\.?\d+)\s*([a-z%]*)$/i;

export function parseLength(input: string): ParsedValue {
  const trimmed = input.trim();
  const m = NUMERIC_RE.exec(trimmed);
  if (m) return { numeric: m[1] ?? "", unit: m[2] ?? "" };
  return { numeric: "", unit: "" };
}

export function buildLength(numeric: string, unit: string): string {
  if (numeric === "" || numeric === "-") return "";
  if (!unit) return numeric;
  return `${numeric}${unit}`;
}

export function rgbToHex(rgb: string): string {
  const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(rgb);
  if (!m) return rgb;
  const [, r, g, b] = m;
  const toHex = (v: string) => Number(v).toString(16).padStart(2, "0");
  return `#${toHex(r ?? "0")}${toHex(g ?? "0")}${toHex(b ?? "0")}`;
}

export function isColorProperty(prop: string): boolean {
  return prop === "color" || prop.endsWith("-color");
}

export function isNumericProperty(prop: string): boolean {
  return (
    prop.startsWith("padding") ||
    prop.startsWith("margin") ||
    prop === "gap" ||
    prop === "font-size" ||
    prop === "line-height" ||
    prop === "letter-spacing" ||
    prop === "border-radius" ||
    prop === "border-width" ||
    prop === "width" ||
    prop === "height" ||
    prop === "font-weight"
  );
}

export function isEnumProperty(prop: string): boolean {
  return prop === "display" || prop === "border-style";
}

export const ENUM_OPTIONS: Record<string, string[]> = {
  display: ["block", "flex", "grid", "inline", "inline-block", "inline-flex", "none"],
  "border-style": ["none", "solid", "dashed", "dotted", "double"],
};

export const UNITS_FOR_PROPERTY: Record<string, string[]> = {
  "font-size": ["px", "rem", "em", "%"],
  "line-height": ["", "px", "rem", "em"],
  "letter-spacing": ["px", "em"],
  width: ["px", "%", "rem", "vw", "auto"],
  height: ["px", "%", "rem", "vh", "auto"],
  gap: ["px", "rem", "em"],
  default: ["px", "rem", "em", "%"],
};

const DEFAULT_UNITS = ["px", "rem", "em", "%"];

export function unitsFor(prop: string): string[] {
  return UNITS_FOR_PROPERTY[prop] ?? DEFAULT_UNITS;
}
