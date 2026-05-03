import type { PropertyChange } from "../../src/shared/types";

export interface ApplyResult {
  appliedCount: number;
  warnings: string[];
}

const TEXT_PROPS = new Set(["font-size", "font-weight", "line-height", "letter-spacing"]);

export async function applyChangesToNode(
  node: SceneNode,
  changes: PropertyChange[],
): Promise<ApplyResult> {
  const warnings: string[] = [];
  let applied = 0;

  // Pre-load any font needed by text-prop changes once, instead of inside each
  // applyOne call. Figma's loadFontAsync is the dominant cost for text edits.
  if (node.type === "TEXT" && changes.some((c) => TEXT_PROPS.has(c.property))) {
    const font = node.fontName;
    if (typeof font !== "symbol") {
      await figma.loadFontAsync(font);
    }
  }

  for (const change of changes) {
    if (change.state !== "default" || change.breakpoint !== "desktop") {
      warnings.push(`skipped ${change.property} (state/breakpoint not supported in Figma)`);
      continue;
    }
    try {
      const did = applyOne(node, change);
      if (did) applied++;
      else warnings.push(`unsupported on this node: ${change.property}`);
    } catch (err) {
      warnings.push(`apply ${change.property} failed: ${(err as Error).message}`);
    }
  }
  return { appliedCount: applied, warnings };
}

function applyOne(node: SceneNode, change: PropertyChange): boolean {
  switch (change.property) {
    case "background-color":
    case "color": {
      if (!("fills" in node)) return false;
      const color = parseCssColor(change.to);
      if (!color) return false;
      (node as unknown as { fills: SolidPaint[] }).fills = [{ type: "SOLID", color: color.rgb, opacity: color.a }];
      return true;
    }
    case "border-radius": {
      if (!("cornerRadius" in node)) return false;
      (node as unknown as { cornerRadius: number }).cornerRadius = parsePx(change.to);
      return true;
    }
    case "border-width": {
      if (!("strokeWeight" in node)) return false;
      (node as unknown as { strokeWeight: number }).strokeWeight = parsePx(change.to);
      return true;
    }
    case "border-color": {
      if (!("strokes" in node)) return false;
      const color = parseCssColor(change.to);
      if (!color) return false;
      (node as unknown as { strokes: SolidPaint[] }).strokes = [{ type: "SOLID", color: color.rgb, opacity: color.a }];
      return true;
    }
    case "padding-top":
    case "padding-right":
    case "padding-bottom":
    case "padding-left": {
      const figmaKey = camel(change.property);
      if (!(figmaKey in node)) return false;
      (node as unknown as Record<string, number>)[figmaKey] = parsePx(change.to);
      return true;
    }
    case "gap": {
      if (!("itemSpacing" in node)) return false;
      (node as unknown as { itemSpacing: number }).itemSpacing = parsePx(change.to);
      return true;
    }
    case "font-size":
    case "font-weight":
    case "line-height":
    case "letter-spacing": {
      // Font already loaded upfront in applyChangesToNode.
      if (node.type !== "TEXT") return false;
      if (typeof node.fontName === "symbol") return false;
      switch (change.property) {
        case "font-size":
          (node as unknown as { fontSize: number }).fontSize = parsePx(change.to);
          return true;
        case "font-weight":
          // Changing font-weight requires loading a different font style; best-effort skip in v0.
          return false;
        case "line-height":
          (node as unknown as { lineHeight: LineHeight }).lineHeight = parseLineHeight(change.to);
          return true;
        case "letter-spacing":
          (node as unknown as { letterSpacing: LetterSpacing }).letterSpacing = parseLetterSpacing(change.to);
          return true;
      }
      return false;
    }
    case "width": {
      if (!("resize" in node)) return false;
      (node as unknown as { resize: (w: number, h: number) => void }).resize(
        parsePx(change.to),
        node.height,
      );
      return true;
    }
    case "height": {
      if (!("resize" in node)) return false;
      (node as unknown as { resize: (w: number, h: number) => void }).resize(
        node.width,
        parsePx(change.to),
      );
      return true;
    }
    default:
      return false;
  }
}

function camel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
}

function parsePx(value: string): number {
  const m = /^(-?\d+(?:\.\d+)?)/.exec(value.trim());
  return m && m[1] ? Number(m[1]) : 0;
}

function parseLineHeight(value: string): LineHeight {
  const v = value.trim();
  if (v.endsWith("px")) return { unit: "PIXELS", value: parsePx(v) };
  return { unit: "PERCENT", value: Number(v) * 100 };
}

function parseLetterSpacing(value: string): LetterSpacing {
  const v = value.trim();
  if (v.endsWith("em")) return { unit: "PERCENT", value: Number(v.slice(0, -2)) * 100 };
  return { unit: "PIXELS", value: parsePx(v) };
}

function parseCssColor(value: string): { rgb: RGB; a: number } | null {
  const v = value.trim();
  const hex = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v);
  if (hex && hex[1]) {
    const n = Number.parseInt(hex[1], 16);
    return {
      rgb: { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 },
      a: hex[2] ? Number.parseInt(hex[2], 16) / 255 : 1,
    };
  }
  const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(v);
  if (rgba && rgba[1] && rgba[2] && rgba[3]) {
    return {
      rgb: {
        r: Number(rgba[1]) / 255,
        g: Number(rgba[2]) / 255,
        b: Number(rgba[3]) / 255,
      },
      a: rgba[4] !== undefined ? Number(rgba[4]) : 1,
    };
  }
  return null;
}
