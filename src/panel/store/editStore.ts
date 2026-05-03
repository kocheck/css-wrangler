import type { PushChangesMsg } from "@shared/bridge-messages";
import type { BreakpointKey, CssState, TierProperty } from "@shared/constants";
import type { TagSiblingsResponse } from "@shared/messages";
import { nanoid } from "@shared/nanoid";
import type { Edit, ElementRef, PropertyChange, StylingSystem } from "@shared/types";
import { create } from "zustand";
import { send as sendBridge } from "../lib/bridge-client";
import { buildPushFromEdit, targetRefForEdit } from "../lib/figma-mapping";
import { sendToContent } from "./messageBridge";

interface EditState {
  url: string;
  stylingSystem: StylingSystem;
  edits: Edit[];
  /** id of the currently expanded edit card */
  selectedId: string | null;
  pickActive: boolean;
  /** undo stack of last-applied changes */
  history: Array<{ kind: "remove-change"; editId: string; changeKey: string }>;
  contentReady: boolean;
  /** UI: which state tab is active per edit */
  selectedStateByEdit: Record<string, CssState>;
  /** UI: which state is being force-previewed per edit (null = no force) */
  forceStateByEdit: Record<string, CssState | null>;
  /** sibling-detection metadata for the most recent pick */
  pendingSibling: {
    editId: string;
    selector: string;
    count: number;
  } | null;
  otherSideTarget: { display: string; kind: "figma-node" } | null;
}

interface EditActions {
  setSource(url: string, stylingSystem: StylingSystem): void;
  setContentReady(ready: boolean): void;
  startPick(): Promise<void>;
  cancelPick(): Promise<void>;
  receiveElement(
    element: ElementRef,
    computed: Partial<Record<TierProperty, string>>,
    similarSelector: string | null,
    similarCount: number,
  ): void;
  applyChange(args: {
    editId: string;
    state: CssState;
    breakpoint: BreakpointKey;
    property: TierProperty;
    value: string;
  }): Promise<void>;
  removeEdit(editId: string): Promise<void>;
  clearAll(): Promise<void>;
  undo(): Promise<void>;
  selectEdit(id: string | null): void;
  setSelectedState(editId: string, state: CssState): void;
  toggleForceState(editId: string): Promise<void>;
  applyToSimilar(editId: string): Promise<void>;
  dismissSiblingPrompt(): void;
  pushSelectedToFigma(): boolean;
  applyFromFigma(msg: PushChangesMsg): Promise<void>;
  setOtherSideTarget(target: { display: string; kind: "figma-node" } | null): void;
}

const changeKey = (s: CssState, b: BreakpointKey, p: TierProperty) => `${s}|${b}|${p}`;

function buildBaseline(computed: Partial<Record<TierProperty, string>>): Record<string, string> {
  const baseline: Record<string, string> = {};
  for (const [prop, val] of Object.entries(computed)) {
    if (val) baseline[changeKey("default", "desktop", prop as TierProperty)] = val;
  }
  return baseline;
}

export const useEditStore = create<EditState & EditActions>((set, get) => ({
  url: "",
  stylingSystem: "plain",
  edits: [],
  selectedId: null,
  pickActive: false,
  history: [],
  contentReady: false,
  selectedStateByEdit: {},
  forceStateByEdit: {},
  pendingSibling: null,
  otherSideTarget: null,

  setSource: (url, stylingSystem) => set({ url, stylingSystem }),
  setContentReady: (ready) => set({ contentReady: ready }),

  startPick: async () => {
    set({ pickActive: true });
    try {
      await sendToContent({ type: "start-pick" });
    } catch (err) {
      console.error("[wrangler] start-pick failed", err);
      set({ pickActive: false });
    }
  },
  cancelPick: async () => {
    set({ pickActive: false });
    try {
      await sendToContent({ type: "cancel-pick" });
    } catch {
      /* ignore */
    }
  },

  receiveElement: (element, computed, similarSelector, similarCount) => {
    const id = element.wranglerId;
    const baseline = buildBaseline(computed);
    set((s) => ({
      pickActive: false,
      selectedId: id,
      edits: [
        ...s.edits,
        {
          id,
          siblingGroup: null,
          element,
          baseline,
          changes: [],
          createdAt: Date.now(),
        },
      ],
      selectedStateByEdit: { ...s.selectedStateByEdit, [id]: "default" },
      pendingSibling:
        similarSelector && similarCount > 1
          ? { editId: id, selector: similarSelector, count: similarCount }
          : null,
    }));
    const justAdded = get().edits[get().edits.length - 1];
    if (justAdded) {
      sendBridge({
        type: "echo",
        from: "panel",
        target: targetRefForEdit(justAdded),
      });
    }
  },

  applyChange: async ({ editId, state, breakpoint, property, value }) => {
    const edit = get().edits.find((e) => e.id === editId);
    if (!edit) return;
    const k = changeKey(state, breakpoint, property);
    const from = edit.baseline[k] ?? "";
    const next: PropertyChange = { state, breakpoint, property, from, to: value };
    const groupId = edit.siblingGroup;
    const targetIds = new Set<string>([editId]);
    if (groupId) {
      for (const e of get().edits) {
        if (e.siblingGroup === groupId) targetIds.add(e.id);
      }
    }

    set((s) => ({
      edits: s.edits.map((e) => {
        if (!targetIds.has(e.id)) return e;
        const filtered = e.changes.filter(
          (c) => !(c.state === state && c.breakpoint === breakpoint && c.property === property),
        );
        // each sibling tracks its own `from` (its own baseline), but shares state/property/to
        const localFrom = e.baseline[k] ?? "";
        const change: PropertyChange = e.id === editId ? next : { ...next, from: localFrom };
        return { ...e, changes: [...filtered, change] };
      }),
      history: [...s.history, { kind: "remove-change", editId, changeKey: k }],
    }));

    const wranglerIds = Array.from(targetIds)
      .map((id) => get().edits.find((e) => e.id === id)?.element.wranglerId)
      .filter((id): id is string => Boolean(id));
    await Promise.all(
      wranglerIds.map((wranglerId) =>
        sendToContent({
          type: "apply-edit",
          wranglerId,
          state,
          breakpoint,
          property,
          value,
        }).catch((err) => {
          console.error("[wrangler] apply-edit failed", err);
        }),
      ),
    );
  },

  removeEdit: async (editId) => {
    const edit = get().edits.find((e) => e.id === editId);
    if (!edit) return;
    const wasSelected = get().selectedId === editId;
    set((s) => {
      const { [editId]: _selectedDrop, ...selectedRest } = s.selectedStateByEdit;
      const { [editId]: _forceDrop, ...forceRest } = s.forceStateByEdit;
      return {
        edits: s.edits.filter((e) => e.id !== editId),
        selectedId: s.selectedId === editId ? null : s.selectedId,
        selectedStateByEdit: selectedRest,
        forceStateByEdit: forceRest,
        pendingSibling: s.pendingSibling?.editId === editId ? null : s.pendingSibling,
      };
    });
    if (wasSelected) {
      sendBridge({ type: "echo", from: "panel", target: null });
    }
    try {
      await sendToContent({ type: "remove-edit", wranglerId: edit.element.wranglerId });
    } catch (err) {
      console.error("[wrangler] remove-edit failed", err);
    }
  },

  clearAll: async () => {
    set({
      edits: [],
      selectedId: null,
      history: [],
      selectedStateByEdit: {},
      forceStateByEdit: {},
      pendingSibling: null,
    });
    sendBridge({ type: "echo", from: "panel", target: null });
    try {
      await sendToContent({ type: "clear-all" });
    } catch (err) {
      console.error("[wrangler] clear-all failed", err);
    }
  },

  undo: async () => {
    const last = get().history[get().history.length - 1];
    if (!last) return;
    set((s) => ({ history: s.history.slice(0, -1) }));
    if (last.kind !== "remove-change") return;

    const edit = get().edits.find((e) => e.id === last.editId);
    if (!edit) return;
    // grouped edits are applied as one source change → undo reverts the whole group
    const targetIds = new Set<string>([edit.id]);
    if (edit.siblingGroup) {
      for (const e of get().edits) {
        if (e.siblingGroup === edit.siblingGroup) targetIds.add(e.id);
      }
    }

    set((s) => ({
      edits: s.edits.map((e) => {
        if (!targetIds.has(e.id)) return e;
        return {
          ...e,
          changes: e.changes.filter(
            (c) => changeKey(c.state, c.breakpoint, c.property) !== last.changeKey,
          ),
        };
      }),
    }));

    const [stateStr, bpStr, prop] = last.changeKey.split("|");
    await Promise.all(
      Array.from(targetIds).map((id) => {
        const target = get().edits.find((e) => e.id === id);
        if (!target) return Promise.resolve();
        const baseline = target.baseline[last.changeKey] ?? "";
        if (!baseline) return Promise.resolve();
        return sendToContent({
          type: "apply-edit",
          wranglerId: target.element.wranglerId,
          state: stateStr as CssState,
          breakpoint: bpStr as BreakpointKey,
          property: prop as TierProperty,
          value: baseline,
        }).catch(() => {
          /* ignore */
        });
      }),
    );
  },

  selectEdit: (id) => {
    set({ selectedId: id });
    const edit = id ? get().edits.find((e) => e.id === id) : null;
    sendBridge({
      type: "echo",
      from: "panel",
      target: edit ? targetRefForEdit(edit) : null,
    });
  },

  setSelectedState: (editId, state) =>
    set((s) => ({ selectedStateByEdit: { ...s.selectedStateByEdit, [editId]: state } })),

  toggleForceState: async (editId) => {
    const edit = get().edits.find((e) => e.id === editId);
    if (!edit) return;
    const currentForce = get().forceStateByEdit[editId] ?? null;
    const selected = get().selectedStateByEdit[editId] ?? "default";
    const next: CssState | null = currentForce === selected ? null : selected;
    set((s) => ({ forceStateByEdit: { ...s.forceStateByEdit, [editId]: next } }));
    try {
      await sendToContent({
        type: "force-state",
        wranglerId: edit.element.wranglerId,
        state: next ?? "default",
      });
    } catch (err) {
      console.error("[wrangler] force-state failed", err);
    }
  },

  applyToSimilar: async (editId) => {
    const edit = get().edits.find((e) => e.id === editId);
    const pending = get().pendingSibling;
    if (!edit || !pending || pending.editId !== editId) return;

    let response: TagSiblingsResponse | undefined;
    try {
      response = (await sendToContent({
        type: "tag-siblings",
        excludeWranglerId: edit.element.wranglerId,
        selector: pending.selector,
      })) as TagSiblingsResponse;
    } catch (err) {
      console.error("[wrangler] tag-siblings failed", err);
      return;
    }
    if (!response?.siblings?.length) {
      set({ pendingSibling: null });
      return;
    }

    const groupId = `g-${nanoid(6)}`;
    const newEdits: Edit[] = response.siblings.map((s) => {
      const baseline = buildBaseline(s.computed);
      return {
        id: s.element.wranglerId,
        siblingGroup: groupId,
        element: s.element,
        baseline,
        // each sibling's `from` reflects its own baseline; `to` mirrors the source
        changes: edit.changes.map((c) => ({
          ...c,
          from: baseline[changeKey(c.state, c.breakpoint, c.property)] ?? "",
        })),
        createdAt: Date.now(),
      };
    });

    set((s) => ({
      edits: [
        ...s.edits.map((e) => (e.id === editId ? { ...e, siblingGroup: groupId } : e)),
        ...newEdits,
      ],
      selectedStateByEdit: {
        ...s.selectedStateByEdit,
        ...Object.fromEntries(newEdits.map((e) => [e.id, "default" as CssState])),
      },
      pendingSibling: null,
    }));

    // replay current changes onto each new sibling so the page mirrors the source edit
    await Promise.all(
      newEdits.flatMap((sib) =>
        sib.changes.map((change) =>
          sendToContent({
            type: "apply-edit",
            wranglerId: sib.element.wranglerId,
            state: change.state,
            breakpoint: change.breakpoint,
            property: change.property,
            value: change.to,
          }).catch(() => {
            /* ignore */
          }),
        ),
      ),
    );
  },

  dismissSiblingPrompt: () => set({ pendingSibling: null }),

  setOtherSideTarget: (target) => set({ otherSideTarget: target }),

  pushSelectedToFigma: () => {
    const id = get().selectedId;
    if (!id) return false;
    const edit = get().edits.find((e) => e.id === id);
    if (!edit || edit.changes.length === 0) return false;
    const msg = buildPushFromEdit(edit);
    return sendBridge(msg);
  },

  applyFromFigma: async (msg) => {
    const id = get().selectedId;
    if (!id) return;
    for (const change of msg.changes) {
      await get().applyChange({
        editId: id,
        state: change.state,
        breakpoint: change.breakpoint,
        property: change.property,
        value: change.to,
      });
    }
    set({
      otherSideTarget: { display: msg.target.display, kind: "figma-node" },
    });
  },
}));
