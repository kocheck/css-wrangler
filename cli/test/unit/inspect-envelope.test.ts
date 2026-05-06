import { describe, expect, it } from "vitest";
import { inspectEnvelope, isPatchShape } from "../../src/core/inspect-envelope";
import { makePatch } from "../helpers/fixtures";

const validPatch = makePatch();

describe("inspectEnvelope", () => {
  it("accepts a well-formed patch-pushed envelope", () => {
    const result = inspectEnvelope({ type: "patch-pushed", version: "1.0", patch: validPatch });
    expect(result.kind).toBe("patch-pushed");
    if (result.kind === "patch-pushed") {
      expect(result.patch.url).toBe("https://example.com");
    }
  });

  it("rejects non-objects", () => {
    expect(inspectEnvelope(null).kind).toBe("invalid");
    expect(inspectEnvelope(undefined).kind).toBe("invalid");
    expect(inspectEnvelope("foo").kind).toBe("invalid");
    expect(inspectEnvelope(42).kind).toBe("invalid");
    expect(inspectEnvelope([]).kind).toBe("invalid");
  });

  it("rejects messages with no type field", () => {
    const r = inspectEnvelope({ patch: validPatch });
    expect(r.kind).toBe("invalid");
    if (r.kind === "invalid") expect(r.reason).toMatch(/no type field/);
  });

  it("rejects messages with non-string type", () => {
    const r = inspectEnvelope({ type: 42, patch: validPatch });
    expect(r.kind).toBe("invalid");
  });

  it("classifies unknown types", () => {
    const r = inspectEnvelope({ type: "garbage" });
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") expect(r.type).toBe("garbage");
  });

  it("rejects wrong protocol versions", () => {
    const r = inspectEnvelope({ type: "patch-pushed", version: "0.9", patch: validPatch });
    expect(r.kind).toBe("invalid");
    if (r.kind === "invalid") expect(r.reason).toMatch(/version mismatch/);
  });

  it("rejects missing patch field", () => {
    const r = inspectEnvelope({ type: "patch-pushed", version: "1.0" });
    expect(r.kind).toBe("invalid");
    if (r.kind === "invalid") expect(r.reason).toMatch(/malformed patch field/);
  });

  it("rejects malformed patch (non-array edits)", () => {
    const r = inspectEnvelope({
      type: "patch-pushed",
      version: "1.0",
      patch: { url: "x", capturedAt: "y", edits: "not-an-array" },
    });
    expect(r.kind).toBe("invalid");
  });

  it("rejects malformed patch (missing url)", () => {
    const r = inspectEnvelope({
      type: "patch-pushed",
      version: "1.0",
      patch: { capturedAt: "y", edits: [] },
    });
    expect(r.kind).toBe("invalid");
  });

  it("rejects malformed patch (missing capturedAt)", () => {
    const r = inspectEnvelope({
      type: "patch-pushed",
      version: "1.0",
      patch: { url: "x", edits: [] },
    });
    expect(r.kind).toBe("invalid");
  });
});

describe("isPatchShape", () => {
  it("accepts the minimal shape", () => {
    expect(isPatchShape({ url: "x", capturedAt: "y", edits: [] })).toBe(true);
  });

  it("accepts a fully-populated patch", () => {
    expect(isPatchShape(validPatch)).toBe(true);
  });

  it("rejects null and primitives", () => {
    expect(isPatchShape(null)).toBe(false);
    expect(isPatchShape(undefined)).toBe(false);
    expect(isPatchShape("x")).toBe(false);
  });

  it("rejects when edits isn't an array", () => {
    expect(isPatchShape({ url: "x", capturedAt: "y", edits: {} })).toBe(false);
  });

  it("rejects when url isn't a string", () => {
    expect(isPatchShape({ url: 42, capturedAt: "y", edits: [] })).toBe(false);
  });
});
