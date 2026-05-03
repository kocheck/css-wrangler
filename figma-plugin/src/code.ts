import { applyChangesToNode } from "./apply";
import { readNodeProperties } from "./mapping";
import type { PropertyChange } from "../../src/shared/types";

figma.showUI(__html__, { width: 360, height: 480, title: "CSS Wrangler Bridge" });

interface NodeInfo {
  id: string;
  name: string;
  type: SceneNode["type"];
}

interface SelectionMessage {
  type: "selection";
  node: NodeInfo | null;
  changes?: PropertyChange[];
  unsupported?: string[];
}

function emitSelection(): void {
  const node = figma.currentPage.selection[0];
  if (!node) {
    const msg: SelectionMessage = { type: "selection", node: null };
    figma.ui.postMessage(msg);
    return;
  }
  const { changes, unsupported } = readNodeProperties(node);
  const msg: SelectionMessage = {
    type: "selection",
    node: { id: node.id, name: node.name, type: node.type },
    changes,
    unsupported,
  };
  figma.ui.postMessage(msg);
}

emitSelection();
figma.on("selectionchange", emitSelection);

interface ApplyFromBrowserMsg {
  type: "apply-from-browser";
  changes: PropertyChange[];
  display: string;
}

interface ApplyResultMsg {
  type: "apply-result";
  ok: boolean;
  reason?: string;
  appliedCount?: number;
  warnings?: string[];
  target?: NodeInfo;
}

figma.ui.onmessage = async (raw: unknown) => {
  if (!raw || typeof raw !== "object") return;
  const msg = raw as { type: string };
  if (msg.type === "apply-from-browser") {
    const m = raw as ApplyFromBrowserMsg;
    const node = figma.currentPage.selection[0];
    if (!node) {
      const out: ApplyResultMsg = { type: "apply-result", ok: false, reason: "no-target" };
      figma.ui.postMessage(out);
      return;
    }
    const result = await applyChangesToNode(node, m.changes);
    figma.commitUndo();
    const out: ApplyResultMsg = {
      type: "apply-result",
      ok: true,
      target: { id: node.id, name: node.name, type: node.type },
      appliedCount: result.appliedCount,
      warnings: result.warnings,
    };
    figma.ui.postMessage(out);
  }
};
