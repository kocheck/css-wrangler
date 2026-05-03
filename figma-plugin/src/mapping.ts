import type { PropertyChange } from "../../src/shared/types";

export interface ReadResult {
  changes: PropertyChange[];
  unsupported: string[];
}

const DEFAULTS = { state: "default" as const, breakpoint: "desktop" as const, tailwindHint: null };

export function readNodeProperties(node: SceneNode): ReadResult {
  const changes: PropertyChange[] = [];
  const unsupported: string[] = [];

  if ("fills" in node && Array.isArray(node.fills)) {
    const fill = node.fills[0];
    if (fill && fill.type === "SOLID") {
      changes.push({
        ...DEFAULTS,
        property: node.type === "TEXT" ? "color" : "background-color",
        from: "",
        to: cssColorFromSolid(fill),
      });
    } else if (fill && fill.type !== "SOLID") {
      unsupported.push(`${fill.type.toLowerCase()} fill`);
    }
  }

  if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
    changes.push({
      ...DEFAULTS,
      property: "border-radius",
      from: "",
      to: `${node.cornerRadius}px`,
    });
  }

  if ("strokes" in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
    const stroke = node.strokes[0];
    if (stroke && stroke.type === "SOLID") {
      changes.push({
        ...DEFAULTS,
        property: "border-color",
        from: "",
        to: cssColorFromSolid(stroke),
      });
    }
    if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
      changes.push({
        ...DEFAULTS,
        property: "border-width",
        from: "",
        to: `${node.strokeWeight}px`,
      });
    }
  }

  if ("paddingTop" in node) {
    const map: Array<["paddingTop" | "paddingRight" | "paddingBottom" | "paddingLeft", "padding-top" | "padding-right" | "padding-bottom" | "padding-left"]> = [
      ["paddingTop", "padding-top"],
      ["paddingRight", "padding-right"],
      ["paddingBottom", "padding-bottom"],
      ["paddingLeft", "padding-left"],
    ];
    for (const [key, prop] of map) {
      const v = (node as unknown as Record<string, number>)[key];
      if (typeof v === "number") {
        changes.push({ ...DEFAULTS, property: prop, from: "", to: `${v}px` });
      }
    }
  }

  if ("itemSpacing" in node && typeof node.itemSpacing === "number") {
    changes.push({ ...DEFAULTS, property: "gap", from: "", to: `${node.itemSpacing}px` });
  }

  if (node.type === "TEXT") {
    if (typeof node.fontSize === "number") {
      changes.push({ ...DEFAULTS, property: "font-size", from: "", to: `${node.fontSize}px` });
    }
    if (typeof node.lineHeight === "object" && "value" in node.lineHeight) {
      const lh = node.lineHeight as { value: number; unit: "PIXELS" | "PERCENT" };
      changes.push({
        ...DEFAULTS,
        property: "line-height",
        from: "",
        to: lh.unit === "PIXELS" ? `${lh.value}px` : `${(lh.value / 100).toFixed(2)}`,
      });
    }
    if (typeof node.letterSpacing === "object" && "value" in node.letterSpacing) {
      const ls = node.letterSpacing as { value: number; unit: "PIXELS" | "PERCENT" };
      changes.push({
        ...DEFAULTS,
        property: "letter-spacing",
        from: "",
        to: ls.unit === "PIXELS" ? `${ls.value}px` : `${(ls.value / 100).toFixed(3)}em`,
      });
    }
    if (node.fontWeight && typeof node.fontWeight === "number") {
      changes.push({ ...DEFAULTS, property: "font-weight", from: "", to: `${node.fontWeight}` });
    }
  }

  if ("layoutSizingHorizontal" in node && (node as unknown as { layoutSizingHorizontal: string }).layoutSizingHorizontal === "FIXED") {
    changes.push({ ...DEFAULTS, property: "width", from: "", to: `${node.width}px` });
  }
  if ("layoutSizingVertical" in node && (node as unknown as { layoutSizingVertical: string }).layoutSizingVertical === "FIXED") {
    changes.push({ ...DEFAULTS, property: "height", from: "", to: `${node.height}px` });
  }

  return { changes, unsupported };
}

function cssColorFromSolid(p: SolidPaint): string {
  const r = Math.round(p.color.r * 255);
  const g = Math.round(p.color.g * 255);
  const b = Math.round(p.color.b * 255);
  const a = p.opacity ?? 1;
  if (a === 1) {
    const hex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
}
