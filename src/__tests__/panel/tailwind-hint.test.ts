import { tailwindHintFor } from "@panel/lib/tailwind-hint";
import { describe, expect, it } from "vitest";

describe("tailwindHintFor", () => {
  describe("spacing (padding/margin)", () => {
    it("maps padding-top px to pt-N", () => {
      expect(tailwindHintFor("padding-top", "16px")).toBe("pt-4");
    });

    it("maps margin-left px to ml-N", () => {
      expect(tailwindHintFor("margin-left", "8px")).toBe("ml-2");
    });

    it("uses 0 for zero spacing", () => {
      expect(tailwindHintFor("padding-top", "0px")).toBe("pt-0");
    });

    it("uses px for 1px (the special pixel utility)", () => {
      expect(tailwindHintFor("padding-top", "1px")).toBe("pt-px");
    });

    it("returns null for off-scale values", () => {
      expect(tailwindHintFor("padding-top", "13px")).toBeNull();
    });

    it("returns null for non-px values", () => {
      expect(tailwindHintFor("padding-top", "1rem")).toBeNull();
    });
  });

  describe("gap", () => {
    it("maps px to gap-N", () => {
      expect(tailwindHintFor("gap", "12px")).toBe("gap-3");
    });
  });

  describe("border-radius", () => {
    it("maps known px values", () => {
      expect(tailwindHintFor("border-radius", "4px")).toBe("rounded");
      expect(tailwindHintFor("border-radius", "8px")).toBe("rounded-lg");
      expect(tailwindHintFor("border-radius", "9999px")).toBe("rounded-full");
    });

    it("returns null for unknown px values", () => {
      expect(tailwindHintFor("border-radius", "5px")).toBeNull();
    });
  });

  describe("font-size", () => {
    it("maps known px values", () => {
      expect(tailwindHintFor("font-size", "16px")).toBe("text-base");
      expect(tailwindHintFor("font-size", "24px")).toBe("text-2xl");
    });

    it("returns null for unknown px values", () => {
      expect(tailwindHintFor("font-size", "13px")).toBeNull();
    });
  });

  describe("font-weight", () => {
    it("maps numeric weights", () => {
      expect(tailwindHintFor("font-weight", "400")).toBe("font-normal");
      expect(tailwindHintFor("font-weight", "700")).toBe("font-bold");
    });

    it("returns null for unknown weights", () => {
      expect(tailwindHintFor("font-weight", "450")).toBeNull();
    });
  });

  describe("display", () => {
    it("maps common values", () => {
      expect(tailwindHintFor("display", "flex")).toBe("flex");
      expect(tailwindHintFor("display", "grid")).toBe("grid");
      expect(tailwindHintFor("display", "block")).toBe("block");
      expect(tailwindHintFor("display", "none")).toBe("hidden");
      expect(tailwindHintFor("display", "inline-block")).toBe("inline-block");
    });

    it("returns null for uncommon values", () => {
      expect(tailwindHintFor("display", "table-row")).toBeNull();
    });
  });

  describe("color properties", () => {
    it("returns null for color (the project doesn't auto-suggest colors)", () => {
      expect(tailwindHintFor("color", "#ff0000")).toBeNull();
      expect(tailwindHintFor("background-color", "rgb(0,0,0)")).toBeNull();
      expect(tailwindHintFor("border-color", "#000")).toBeNull();
    });
  });
});
