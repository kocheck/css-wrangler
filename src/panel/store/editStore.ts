import type { BreakpointKey, CssState, TierProperty } from "@shared/constants";
import type { Edit, ElementRef, PropertyChange, StylingSystem } from "@shared/types";
import { create } from "zustand";
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
}

interface EditActions {
  setSource(url: string, stylingSystem: StylingSystem): void;
  setContentReady(ready: boolean): void;
  startPick(): Promise<void>;
  cancelPick(): Promise<void>;
  receiveElement(element: ElementRef, computed: Partial<Record<TierProperty, string>>): void;
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
}

const changeKey = (s: CssState, b: BreakpointKey, p: TierProperty) => `${s}|${b}|${p}`;

export const useEditStore = create<EditState & EditActions>((set, get) => ({
  url: "",
  stylingSystem: "plain",
  edits: [],
  selectedId: null,
  pickActive: false,
  history: [],
  contentReady: false,

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

  receiveElement: (element, computed) => {
    const baseline: Record<string, string> = {};
    for (const [prop, val] of Object.entries(computed)) {
      if (val) baseline[changeKey("default", "desktop", prop as TierProperty)] = val;
    }
    const id = element.wranglerId;
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
    }));
  },

  applyChange: async ({ editId, state, breakpoint, property, value }) => {
    const edit = get().edits.find((e) => e.id === editId);
    if (!edit) return;
    const k = changeKey(state, breakpoint, property);
    const from = edit.baseline[k] ?? "";
    const next: PropertyChange = {
      state,
      breakpoint,
      property,
      from,
      to: value,
    };
    set((s) => ({
      edits: s.edits.map((e) => {
        if (e.id !== editId) return e;
        const filtered = e.changes.filter(
          (c) => !(c.state === state && c.breakpoint === breakpoint && c.property === property),
        );
        return { ...e, changes: [...filtered, next] };
      }),
      history: [...s.history, { kind: "remove-change", editId, changeKey: k }],
    }));
    try {
      await sendToContent({
        type: "apply-edit",
        wranglerId: edit.element.wranglerId,
        state,
        breakpoint,
        property,
        value,
      });
    } catch (err) {
      console.error("[wrangler] apply-edit failed", err);
    }
  },

  removeEdit: async (editId) => {
    const edit = get().edits.find((e) => e.id === editId);
    if (!edit) return;
    set((s) => ({
      edits: s.edits.filter((e) => e.id !== editId),
      selectedId: s.selectedId === editId ? null : s.selectedId,
    }));
    try {
      await sendToContent({ type: "remove-edit", wranglerId: edit.element.wranglerId });
    } catch (err) {
      console.error("[wrangler] remove-edit failed", err);
    }
  },

  clearAll: async () => {
    set({ edits: [], selectedId: null, history: [] });
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
    if (last.kind === "remove-change") {
      const edit = get().edits.find((e) => e.id === last.editId);
      if (!edit) return;
      const remaining = edit.changes.filter(
        (c) => changeKey(c.state, c.breakpoint, c.property) !== last.changeKey,
      );
      set((s) => ({
        edits: s.edits.map((e) => (e.id === last.editId ? { ...e, changes: remaining } : e)),
      }));
      // re-emit remaining for that property by clearing — for v1, simple approach: full re-apply of remaining changes
      // We optimistically remove the rule via apply-edit with the baseline value:
      const [stateStr, bpStr, prop] = last.changeKey.split("|");
      const baseline = edit.baseline[last.changeKey] ?? "";
      if (baseline) {
        try {
          await sendToContent({
            type: "apply-edit",
            wranglerId: edit.element.wranglerId,
            state: stateStr as CssState,
            breakpoint: bpStr as BreakpointKey,
            property: prop as TierProperty,
            value: baseline,
          });
        } catch {
          /* ignore */
        }
      }
    }
  },

  selectEdit: (id) => set({ selectedId: id }),
}));
