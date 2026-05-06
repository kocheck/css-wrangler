import { extractCssModulesName, isGeneratedClass, isMeaningfulId } from "@content/selectors";
import { describe, expect, it } from "vitest";

describe("extractCssModulesName", () => {
  it("unwraps the standard webpack css-loader pattern", () => {
    expect(extractCssModulesName("ChatForm-module__chatForm__abc123")).toBe("chatForm");
  });

  it("returns null for non-modules classes", () => {
    expect(extractCssModulesName("hero")).toBeNull();
    expect(extractCssModulesName("css-abc123")).toBeNull();
  });

  it("returns null when the prefix isn't capitalized", () => {
    expect(extractCssModulesName("chatform-module__chatForm__abc123")).toBeNull();
  });

  it("requires at least 4 hash chars", () => {
    expect(extractCssModulesName("ChatForm-module__chatForm__abc")).toBeNull();
  });
});

describe("isGeneratedClass", () => {
  it("flags emotion / generated css- patterns", () => {
    expect(isGeneratedClass("css-abc123")).toBe(true);
    expect(isGeneratedClass("css-1k2j3l4")).toBe(true);
  });

  it("flags styled-components sc- patterns", () => {
    expect(isGeneratedClass("sc-bczRLJ")).toBe(true);
  });

  it("flags styled-jsx jsx-N patterns", () => {
    expect(isGeneratedClass("jsx-1234567")).toBe(true);
  });

  it("flags long pure-alphanum hashes", () => {
    expect(isGeneratedClass("abc123def")).toBe(true);
  });

  it("flags raw css-modules classes", () => {
    expect(isGeneratedClass("ChatForm-module__chatForm__abc123")).toBe(true);
  });

  it("flags __wrangler-* (the extension's own classes)", () => {
    expect(isGeneratedClass("__wrangler-abc123")).toBe(true);
  });

  it("flags empty string", () => {
    expect(isGeneratedClass("")).toBe(true);
  });

  it("doesn't flag plain semantic class names", () => {
    expect(isGeneratedClass("hero")).toBe(false);
    expect(isGeneratedClass("primary-button")).toBe(false);
    expect(isGeneratedClass("nav-item")).toBe(false);
  });

  it("doesn't flag short Tailwind utility classes", () => {
    expect(isGeneratedClass("px-4")).toBe(false);
    expect(isGeneratedClass("text-lg")).toBe(false);
    expect(isGeneratedClass("flex")).toBe(false);
  });
});

describe("isMeaningfulId", () => {
  it("accepts plain semantic ids", () => {
    expect(isMeaningfulId("hero")).toBe(true);
    expect(isMeaningfulId("nav-main")).toBe(true);
    expect(isMeaningfulId("checkout-form")).toBe(true);
  });

  it("rejects null and empty", () => {
    expect(isMeaningfulId(null)).toBe(false);
    expect(isMeaningfulId("")).toBe(false);
  });

  it("rejects long hex hashes", () => {
    expect(isMeaningfulId("abc12345")).toBe(false);
    expect(isMeaningfulId("deadbeef")).toBe(false);
  });

  it("rejects ids that start with a digit", () => {
    expect(isMeaningfulId("1stItem")).toBe(false);
  });

  it("rejects too-short ids", () => {
    expect(isMeaningfulId("a")).toBe(false);
    expect(isMeaningfulId("ab")).toBe(false);
  });
});
