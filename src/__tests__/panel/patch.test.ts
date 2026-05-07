import { buildPatch, buildPatchMarkdown } from "@panel/lib/patch";
import type { Edit } from "@shared/types";
import { describe, expect, it } from "vitest";

function makeEdit(overrides: Partial<Edit> = {}): Edit {
  return {
    id: "edit-1",
    siblingGroup: null,
    element: {
      wranglerId: "abc123",
      tag: "div",
      text: null,
      role: null,
      ariaLabel: null,
      selectors: [{ type: "id", value: "#hero", stability: "high" }],
      domPath: "body > main > div",
    },
    baseline: {},
    changes: [
      {
        state: "default",
        breakpoint: "desktop",
        property: "padding-top",
        from: "8px",
        to: "16px",
        tailwindHint: null,
      },
    ],
    createdAt: Date.parse("2026-05-06T18:00:00.000Z"),
    ...overrides,
  };
}

describe("buildPatch", () => {
  it("returns a versioned envelope with empty edits", () => {
    const patch = buildPatch({ url: "https://x.com", stylingSystem: "plain", edits: [] });
    expect(patch.version).toBe("1.0");
    expect(patch.source).toBe("css-wrangler");
    expect(patch.url).toBe("https://x.com");
    expect(patch.stylingSystem).toBe("plain");
    expect(patch.edits).toEqual([]);
  });

  it("filters out edits with no changes", () => {
    const empty = makeEdit({ changes: [] });
    const real = makeEdit();
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [empty, real] });
    expect(patch.edits.length).toBe(1);
  });

  it("preserves siblingGroup", () => {
    const edit = makeEdit({ siblingGroup: "btn-group" });
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    expect(patch.edits[0]?.siblingGroup).toBe("btn-group");
  });

  it("strips wranglerId from the output element", () => {
    const edit = makeEdit();
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    expect((patch.edits[0]?.element as Record<string, unknown>).wranglerId).toBeUndefined();
  });

  it("attaches a Tailwind hint when stylingSystem is tailwind", () => {
    const edit = makeEdit({
      changes: [
        {
          state: "default",
          breakpoint: "desktop",
          property: "padding-top",
          from: "0px",
          to: "16px",
          tailwindHint: null,
        },
      ],
    });
    const patch = buildPatch({ url: "x", stylingSystem: "tailwind", edits: [edit] });
    expect(patch.edits[0]?.changes[0]?.tailwindHint).toBe("pt-4");
  });

  it("leaves Tailwind hint null when stylingSystem isn't tailwind", () => {
    const edit = makeEdit({
      changes: [
        {
          state: "default",
          breakpoint: "desktop",
          property: "padding-top",
          from: "0px",
          to: "16px",
          tailwindHint: null,
        },
      ],
    });
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    expect(patch.edits[0]?.changes[0]?.tailwindHint).toBeNull();
  });

  it("emits an ISO capturedAt", () => {
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [] });
    expect(() => new Date(patch.capturedAt).toISOString()).not.toThrow();
    expect(patch.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("includes all three breakpoints", () => {
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [] });
    expect(patch.breakpoints.mobile).toBeDefined();
    expect(patch.breakpoints.tablet).toBeDefined();
    expect(patch.breakpoints.desktop).toBeDefined();
  });

  it("emits mediaQuery: null for a desktop change", () => {
    const edit = makeEdit();
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    expect(patch.edits[0]?.changes[0]?.mediaQuery).toBeNull();
  });

  it("omits media blocks when an edit only has desktop changes", () => {
    const edit = makeEdit();
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    const patchEdit = patch.edits[0];
    if (!patchEdit) throw new Error("expected patch edit");

    expect(patchEdit.media).toBeUndefined();
  });

  it("emits @media (max-width: 768px) for a tablet change", () => {
    const edit = makeEdit({
      changes: [
        {
          state: "default",
          breakpoint: "tablet",
          property: "padding-top",
          from: "8px",
          to: "12px",
          tailwindHint: null,
        },
      ],
    });
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    expect(patch.edits[0]?.changes[0]?.mediaQuery).toBe("@media (max-width: 768px)");
  });

  it("emits @media (max-width: 375px) for a mobile change", () => {
    const edit = makeEdit({
      changes: [
        {
          state: "default",
          breakpoint: "mobile",
          property: "padding-top",
          from: "8px",
          to: "10px",
          tailwindHint: null,
        },
      ],
    });
    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    expect(patch.edits[0]?.changes[0]?.mediaQuery).toBe("@media (max-width: 375px)");
  });

  it("groups non-desktop changes into additive media blocks", () => {
    const edit = makeEdit({
      changes: [
        {
          state: "default",
          breakpoint: "desktop",
          property: "padding-top",
          from: "8px",
          to: "16px",
          tailwindHint: null,
        },
        {
          state: "default",
          breakpoint: "tablet",
          property: "padding-top",
          from: "8px",
          to: "12px",
          tailwindHint: null,
        },
        {
          state: "hover",
          breakpoint: "mobile",
          property: "background-color",
          from: "rgb(255, 255, 255)",
          to: "rgb(0, 0, 0)",
          tailwindHint: null,
        },
      ],
    });

    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    const patchEdit = patch.edits[0];
    if (!patchEdit) throw new Error("expected patch edit");

    expect(patchEdit.changes).toHaveLength(3);
    expect(patchEdit.media).toEqual([
      {
        breakpoint: "tablet",
        query: "@media (max-width: 768px)",
        changes: [patchEdit.changes[1]],
      },
      {
        breakpoint: "mobile",
        query: "@media (max-width: 375px)",
        changes: [patchEdit.changes[2]],
      },
    ]);
  });

  it("emits a media block for a tablet-only edit (no desktop change)", () => {
    const edit = makeEdit({
      changes: [
        {
          state: "default",
          breakpoint: "tablet",
          property: "padding-top",
          from: "8px",
          to: "12px",
          tailwindHint: null,
        },
      ],
    });

    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    const patchEdit = patch.edits[0];
    if (!patchEdit) throw new Error("expected patch edit");

    expect(patchEdit.changes).toHaveLength(1);
    expect(patchEdit.media).toEqual([
      {
        breakpoint: "tablet",
        query: "@media (max-width: 768px)",
        changes: [patchEdit.changes[0]],
      },
    ]);
  });

  it("emits a media block for a mobile-only edit (no desktop change)", () => {
    const edit = makeEdit({
      changes: [
        {
          state: "default",
          breakpoint: "mobile",
          property: "padding-top",
          from: "8px",
          to: "10px",
          tailwindHint: null,
        },
      ],
    });

    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    const patchEdit = patch.edits[0];
    if (!patchEdit) throw new Error("expected patch edit");

    expect(patchEdit.changes).toHaveLength(1);
    expect(patchEdit.media).toEqual([
      {
        breakpoint: "mobile",
        query: "@media (max-width: 375px)",
        changes: [patchEdit.changes[0]],
      },
    ]);
  });

  it("groups multiple changes for the same breakpoint into one media block", () => {
    const edit = makeEdit({
      changes: [
        {
          state: "default",
          breakpoint: "tablet",
          property: "padding-top",
          from: "8px",
          to: "12px",
          tailwindHint: null,
        },
        {
          state: "default",
          breakpoint: "tablet",
          property: "font-size",
          from: "16px",
          to: "14px",
          tailwindHint: null,
        },
      ],
    });

    const patch = buildPatch({ url: "x", stylingSystem: "plain", edits: [edit] });
    const patchEdit = patch.edits[0];
    if (!patchEdit) throw new Error("expected patch edit");

    expect(patchEdit.media).toHaveLength(1);
    expect(patchEdit.media?.[0]?.breakpoint).toBe("tablet");
    expect(patchEdit.media?.[0]?.changes).toEqual([patchEdit.changes[0], patchEdit.changes[1]]);
  });
});

describe("buildPatchMarkdown", () => {
  it("includes the rules header", () => {
    const md = buildPatchMarkdown({ url: "x", stylingSystem: "plain", edits: [] });
    expect(md).toContain("## Instructions for Claude Code");
    expect(md).toContain("Honor `siblingGroup`");
  });

  it("includes the source URL", () => {
    const md = buildPatchMarkdown({
      url: "https://example.com/page",
      stylingSystem: "plain",
      edits: [],
    });
    expect(md).toContain("# Source: https://example.com/page");
  });

  it("contains a JSON code fence with the patch", () => {
    const md = buildPatchMarkdown({ url: "x", stylingSystem: "plain", edits: [makeEdit()] });
    expect(md).toMatch(/```json\n\{[\s\S]*"version": "1\.0"/);
  });

  it("ends the markdown after the closing fence", () => {
    const md = buildPatchMarkdown({ url: "x", stylingSystem: "plain", edits: [] });
    expect(md.trim().endsWith("````")).toBe(true);
  });
});
