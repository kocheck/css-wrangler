import { parsePort } from "@shared/validate-port";
import { describe, expect, it } from "vitest";

describe("parsePort", () => {
  it("returns the default when env is undefined", () => {
    expect(parsePort(undefined, 9124)).toBe(9124);
  });

  it("parses a valid env value", () => {
    expect(parsePort("9999", 9124)).toBe(9999);
  });

  it("accepts the lower boundary", () => {
    expect(parsePort("1", 9124)).toBe(1);
  });

  it("accepts the upper boundary", () => {
    expect(parsePort("65535", 9124)).toBe(65535);
  });

  it("rejects 0", () => {
    expect(() => parsePort("0", 9124)).toThrow(/invalid port/);
  });

  it("rejects 65536", () => {
    expect(() => parsePort("65536", 9124)).toThrow(/invalid port/);
  });

  it("rejects NaN-producing strings", () => {
    expect(() => parsePort("abc", 9124)).toThrow(/invalid port/);
  });

  it("rejects negative numbers", () => {
    expect(() => parsePort("-1", 9124)).toThrow(/invalid port/);
  });

  it("rejects non-integer values", () => {
    expect(() => parsePort("9124.5", 9124)).toThrow(/invalid port/);
  });

  it("includes the offending value in the error message", () => {
    expect(() => parsePort("99999", 9124)).toThrow(/99999/);
  });
});
