import type { BreakpointKey, CssState, TierProperty } from "@shared/constants";
import type { Edit, ElementRef, PropertyChange } from "@shared/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendBridgeMock, sendToContentMock } = vi.hoisted(() => ({
  sendBridgeMock: vi.fn(() => false),
  sendToContentMock: vi.fn(async () => undefined),
}));

vi.mock("@panel/lib/bridge-client", () => ({
  send: sendBridgeMock,
}));

vi.mock("@panel/store/messageBridge", () => ({
  sendToContent: sendToContentMock,
}));

import { useEditStore } from "@panel/store/editStore";

function makeElement(id: string): ElementRef {
  return {
    wranglerId: id,
    tag: "div",
    text: null,
    role: null,
    ariaLabel: null,
    selectors: [{ type: "class", value: ".card", stability: "medium" }],
    domPath: `body > div.${id}`,
  };
}

function makeChange(overrides: Partial<PropertyChange> = {}): PropertyChange {
  return {
    state: "default",
    breakpoint: "desktop",
    property: "padding-top",
    from: "8px",
    to: "16px",
    ...overrides,
  };
}

function keyFor(state: CssState, breakpoint: BreakpointKey, property: TierProperty): string {
  return `${state}|${breakpoint}|${property}`;
}

function makeEdit(overrides: Partial<Edit> = {}): Edit {
  const id = overrides.id ?? "__wrangler-a";
  return {
    id,
    siblingGroup: null,
    element: makeElement(id),
    baseline: { [keyFor("default", "desktop", "padding-top")]: "8px" },
    changes: [makeChange()],
    createdAt: Date.parse("2026-05-07T10:00:00.000Z"),
    ...overrides,
  };
}

function resetStore(edits: Edit[] = []): void {
  useEditStore.setState({
    url: "",
    stylingSystem: "plain",
    edits,
    selectedId: edits[0]?.id ?? null,
    pickActive: false,
    history: [],
    contentReady: true,
    selectedStateByEdit: {},
    forceStateByEdit: {},
    pendingSibling: null,
    otherSideTarget: null,
    bridgeNotice: null,
  });
}

beforeEach(() => {
  sendBridgeMock.mockClear();
  sendToContentMock.mockClear();
  resetStore();
});

describe("editStore applyChange clears", () => {
  it("drops a staged change and emits remove-rule for an empty value", async () => {
    const edit = makeEdit();
    resetStore([edit]);

    await useEditStore.getState().applyChange({
      editId: edit.id,
      state: "default",
      breakpoint: "desktop",
      property: "padding-top",
      value: "",
    });

    expect(useEditStore.getState().edits[0]?.changes).toEqual([]);
    expect(useEditStore.getState().history).toEqual([]);
    expect(sendToContentMock).toHaveBeenCalledTimes(1);
    expect(sendToContentMock).toHaveBeenCalledWith({
      type: "remove-rule",
      wranglerId: edit.element.wranglerId,
      state: "default",
      breakpoint: "desktop",
      property: "padding-top",
    });
  });

  it("treats whitespace-only values as clears", async () => {
    const edit = makeEdit();
    resetStore([edit]);

    await useEditStore.getState().applyChange({
      editId: edit.id,
      state: "default",
      breakpoint: "desktop",
      property: "padding-top",
      value: "   ",
    });

    expect(useEditStore.getState().edits[0]?.changes).toEqual([]);
    expect(sendToContentMock).toHaveBeenCalledWith({
      type: "remove-rule",
      wranglerId: edit.element.wranglerId,
      state: "default",
      breakpoint: "desktop",
      property: "padding-top",
    });
  });

  it("clears the same property from every sibling in the group", async () => {
    const source = makeEdit({ id: "__wrangler-a", siblingGroup: "group-1" });
    const sibling = makeEdit({
      id: "__wrangler-b",
      siblingGroup: "group-1",
      element: makeElement("__wrangler-b"),
      baseline: { [keyFor("default", "desktop", "padding-top")]: "10px" },
      changes: [makeChange({ from: "10px" })],
    });
    resetStore([source, sibling]);

    await useEditStore.getState().applyChange({
      editId: source.id,
      state: "default",
      breakpoint: "desktop",
      property: "padding-top",
      value: "",
    });

    expect(useEditStore.getState().edits.map((edit) => edit.changes)).toEqual([[], []]);
    expect(sendToContentMock).toHaveBeenCalledTimes(2);
    expect(sendToContentMock).toHaveBeenCalledWith({
      type: "remove-rule",
      wranglerId: "__wrangler-a",
      state: "default",
      breakpoint: "desktop",
      property: "padding-top",
    });
    expect(sendToContentMock).toHaveBeenCalledWith({
      type: "remove-rule",
      wranglerId: "__wrangler-b",
      state: "default",
      breakpoint: "desktop",
      property: "padding-top",
    });
  });
});

describe("editStore undo clears", () => {
  it("emits remove-rule instead of apply-edit with an empty baseline", async () => {
    const property = "background-color";
    const changeKey = keyFor("hover", "desktop", property);
    const edit = makeEdit({
      baseline: {},
      changes: [
        makeChange({
          state: "hover",
          property,
          from: "",
          to: "#ff0000",
        }),
      ],
    });
    resetStore([edit]);
    useEditStore.setState({
      history: [{ kind: "remove-change", editId: edit.id, changeKey }],
    });

    await useEditStore.getState().undo();

    expect(useEditStore.getState().edits[0]?.changes).toEqual([]);
    expect(sendToContentMock).toHaveBeenCalledTimes(1);
    expect(sendToContentMock).toHaveBeenCalledWith({
      type: "remove-rule",
      wranglerId: edit.element.wranglerId,
      state: "hover",
      breakpoint: "desktop",
      property,
    });
    expect(sendToContentMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "apply-edit", value: "" }),
    );
  });
});
