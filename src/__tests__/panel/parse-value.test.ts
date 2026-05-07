import {
  buildLength,
  isColorProperty,
  isEnumProperty,
  isNumericProperty,
  parseLength,
  rgbToHex,
  unitsFor,
} from "@panel/lib/parse-value";
import { describe, expect, it } from "vitest";

describe("parseLength", () => {
  it("parses px", () => {
    expect(parseLength("16px")).toEqual({ numeric: "16", unit: "px" });
  });

  it("parses rem", () => {
    expect(parseLength("1.5rem")).toEqual({ numeric: "1.5", unit: "rem" });
  });

  it("parses %", () => {
    expect(parseLength("50%")).toEqual({ numeric: "50", unit: "%" });
  });

  it("parses unitless numbers", () => {
    expect(parseLength("1.4")).toEqual({ numeric: "1.4", unit: "" });
  });

  it("parses negatives", () => {
    expect(parseLength("-4px")).toEqual({ numeric: "-4", unit: "px" });
  });

  it("trims whitespace", () => {
    expect(parseLength("  12px  ")).toEqual({ numeric: "12", unit: "px" });
  });

  it("preserves keyword values like `auto` (case-insensitive)", () => {
    expect(parseLength("auto")).toEqual({ numeric: "", unit: "auto" });
    expect(parseLength("AUTO")).toEqual({ numeric: "", unit: "auto" });
    expect(parseLength("  auto  ")).toEqual({ numeric: "", unit: "auto" });
  });

  it("returns empty for malformed input", () => {
    expect(parseLength("1.2.3px")).toEqual({ numeric: "", unit: "" });
  });
});

describe("buildLength", () => {
  it("composes numeric + unit", () => {
    expect(buildLength("16", "px")).toBe("16px");
  });

  it("returns the bare number when unit is empty", () => {
    expect(buildLength("1.5", "")).toBe("1.5");
  });

  it("returns empty when numeric is empty", () => {
    expect(buildLength("", "px")).toBe("");
  });

  it("returns empty when numeric is just a sign", () => {
    expect(buildLength("-", "px")).toBe("");
  });

  it("returns the keyword verbatim when unit is `auto`", () => {
    expect(buildLength("", "auto")).toBe("auto");
    expect(buildLength("100", "auto")).toBe("auto");
  });
});

describe("rgbToHex", () => {
  it("converts rgb()", () => {
    expect(rgbToHex("rgb(255, 0, 128)")).toBe("#ff0080");
  });

  it("converts rgba()", () => {
    expect(rgbToHex("rgba(0, 0, 0, 0.5)")).toBe("#000000");
  });

  it("zero-pads single-digit channels", () => {
    expect(rgbToHex("rgb(1, 2, 3)")).toBe("#010203");
  });

  it("returns the input verbatim when not parseable", () => {
    expect(rgbToHex("currentColor")).toBe("currentColor");
    expect(rgbToHex("#ff0000")).toBe("#ff0000");
  });
});

describe("isColorProperty", () => {
  it("matches color and *-color", () => {
    expect(isColorProperty("color")).toBe(true);
    expect(isColorProperty("background-color")).toBe(true);
    expect(isColorProperty("border-color")).toBe(true);
  });

  it("doesn't match non-color properties", () => {
    expect(isColorProperty("padding")).toBe(false);
    expect(isColorProperty("font-size")).toBe(false);
  });
});

describe("isNumericProperty", () => {
  it("matches padding-* and margin-*", () => {
    expect(isNumericProperty("padding-top")).toBe(true);
    expect(isNumericProperty("margin-left")).toBe(true);
  });

  it("matches font-size, line-height, letter-spacing", () => {
    expect(isNumericProperty("font-size")).toBe(true);
    expect(isNumericProperty("line-height")).toBe(true);
    expect(isNumericProperty("letter-spacing")).toBe(true);
  });

  it("matches width, height, gap, font-weight, border-*", () => {
    expect(isNumericProperty("width")).toBe(true);
    expect(isNumericProperty("height")).toBe(true);
    expect(isNumericProperty("gap")).toBe(true);
    expect(isNumericProperty("font-weight")).toBe(true);
    expect(isNumericProperty("border-radius")).toBe(true);
    expect(isNumericProperty("border-width")).toBe(true);
  });

  it("doesn't match color or display", () => {
    expect(isNumericProperty("color")).toBe(false);
    expect(isNumericProperty("display")).toBe(false);
  });
});

describe("isEnumProperty", () => {
  it("matches display and border-style", () => {
    expect(isEnumProperty("display")).toBe(true);
    expect(isEnumProperty("border-style")).toBe(true);
  });

  it("doesn't match other properties", () => {
    expect(isEnumProperty("padding")).toBe(false);
  });
});

describe("unitsFor", () => {
  it("returns the property-specific list when defined", () => {
    expect(unitsFor("font-size")).toContain("px");
    expect(unitsFor("font-size")).toContain("rem");
  });

  it("includes auto for width and height", () => {
    expect(unitsFor("width")).toContain("auto");
    expect(unitsFor("height")).toContain("auto");
  });

  it("falls back to the default list for unknown properties", () => {
    expect(unitsFor("padding")).toEqual(["px", "rem", "em", "%"]);
  });
});
