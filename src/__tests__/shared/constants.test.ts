import { BREAKPOINTS, mediaQueryFor } from "@shared/constants";
import { describe, expect, it } from "vitest";

describe("mediaQueryFor", () => {
  it("returns null for desktop", () => {
    expect(mediaQueryFor("desktop")).toBeNull();
  });

  it("derives the tablet query from BREAKPOINTS.tablet", () => {
    expect(mediaQueryFor("tablet")).toBe(`@media (max-width: ${BREAKPOINTS.tablet}px)`);
  });

  it("derives the mobile query from BREAKPOINTS.mobile", () => {
    expect(mediaQueryFor("mobile")).toBe(`@media (max-width: ${BREAKPOINTS.mobile}px)`);
  });
});
