import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type BridgeStatus,
  getStatus,
  onMessage as onBridgeMessage,
  onStatus,
  send as sendBridge,
  startBridgeClient,
} from "./bridge-client";
import type { PropertyChange } from "../../src/shared/types";
import type { TargetRef } from "../../src/shared/bridge-messages";

interface NodeInfo {
  id: string;
  name: string;
  type: string;
}

interface SelectionState {
  node: NodeInfo | null;
  changes: PropertyChange[];
  unsupported: string[];
}

const EMPTY: SelectionState = { node: null, changes: [], unsupported: [] };

function postToSandbox(msg: object): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

function App() {
  const [bridge, setBridge] = useState<BridgeStatus>(getStatus());
  const [selection, setSelection] = useState<SelectionState>(EMPTY);
  const [otherTarget, setOtherTarget] = useState<TargetRef | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    startBridgeClient();
    return onStatus(setBridge);
  }, []);

  useEffect(() => {
    return onBridgeMessage((msg) => {
      if (msg.type === "echo" && msg.from === "panel") {
        setOtherTarget(msg.target);
      } else if (msg.type === "push-changes" && msg.from === "panel") {
        postToSandbox({ type: "apply-from-browser", changes: msg.changes, display: msg.target.display });
      }
    });
  }, []);

  useEffect(() => {
    function onSandbox(ev: MessageEvent) {
      const data = ev.data?.pluginMessage;
      if (!data || typeof data !== "object") return;
      if (data.type === "selection") {
        setSelection({
          node: data.node ?? null,
          changes: data.changes ?? [],
          unsupported: data.unsupported ?? [],
        });
        sendBridge({
          type: "echo",
          from: "figma",
          target: data.node
            ? { kind: "figma-node", id: data.node.id, display: targetDisplay(data.node) }
            : null,
        });
      } else if (data.type === "apply-result") {
        setFlash(data.ok ? `Applied ${data.appliedCount ?? 0}` : `Skipped: ${data.reason}`);
        window.setTimeout(() => setFlash(null), 1500);
      }
    }
    window.addEventListener("message", onSandbox);
    return () => window.removeEventListener("message", onSandbox);
  }, []);

  function pushToBrowser() {
    if (!selection.node || selection.changes.length === 0) {
      setFlash("Nothing to push");
      window.setTimeout(() => setFlash(null), 1500);
      return;
    }
    const ok = sendBridge({
      type: "push-changes",
      from: "figma",
      target: { kind: "figma-node", id: selection.node.id, display: targetDisplay(selection.node) },
      changes: selection.changes,
    });
    setFlash(ok ? "Pushed →" : "Bridge offline");
    window.setTimeout(() => setFlash(null), 1500);
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span style={styles.brand}>CSS Wrangler Bridge</span>
        <span style={{ ...styles.pill, ...statusPill(bridge) }}>BRIDGE {bridge.toUpperCase()}</span>
      </header>

      <section style={styles.section}>
        <div style={styles.label}>FIGMA TARGET</div>
        <div style={styles.target}>
          {selection.node ? `${selection.node.type.toLowerCase()} "${selection.node.name}"` : "— nothing selected —"}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.label}>BROWSER TARGET</div>
        <div style={styles.target}>
          {otherTarget ? otherTarget.display : "— nothing picked —"}
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.label}>READY TO PUSH ({selection.changes.length})</div>
        {selection.changes.length === 0 ? (
          <div style={styles.empty}>No supported properties on this node.</div>
        ) : (
          <ul style={styles.list}>
            {selection.changes.map((c) => (
              <li key={c.property} style={styles.row}>
                <span>{c.property}</span>
                <span style={styles.value}>{c.to}</span>
              </li>
            ))}
          </ul>
        )}
        {selection.unsupported.length > 0 && (
          <div style={styles.unsupported}>
            Skipped: {selection.unsupported.join(", ")}
          </div>
        )}
      </section>

      <footer style={styles.footer}>
        <button
          type="button"
          onClick={pushToBrowser}
          disabled={bridge !== "connected" || !selection.node || selection.changes.length === 0}
          style={styles.pushButton}
        >
          {flash ?? "Push to browser →"}
        </button>
      </footer>
    </div>
  );
}

function targetDisplay(node: NodeInfo): string {
  return `${node.type.toLowerCase()} "${node.name.slice(0, 24)}"`;
}

function statusPill(s: BridgeStatus): { color: string; borderColor: string } {
  if (s === "connected") return { color: "#9ec79e", borderColor: "#9ec79e" };
  if (s === "connecting") return { color: "#c4a484", borderColor: "#c4a484" };
  return { color: "#888", borderColor: "#444" };
}

const styles: Record<string, React.CSSProperties> = {
  app: { display: "flex", flexDirection: "column", height: "100vh", background: "#111", color: "#eee", fontSize: 12, fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #222" },
  brand: { fontWeight: 600, letterSpacing: 0.4 },
  pill: { fontSize: 9, letterSpacing: 1, padding: "2px 8px", border: "1px solid", borderRadius: 2 },
  section: { padding: "12px 14px", borderBottom: "1px solid #1a1a1a" },
  label: { fontSize: 9, letterSpacing: 1.2, color: "#7a7a7a", marginBottom: 4 },
  target: { fontFamily: "ui-monospace, monospace", color: "#ddd", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  empty: { color: "#666", fontStyle: "italic" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 },
  row: { display: "flex", justifyContent: "space-between", fontFamily: "ui-monospace, monospace", color: "#ccc" },
  value: { color: "#c4a484" },
  unsupported: { marginTop: 8, fontSize: 10, color: "#a06060" },
  footer: { marginTop: "auto", padding: 14, borderTop: "1px solid #222" },
  pushButton: { width: "100%", padding: "10px 14px", background: "#222", color: "#eee", border: "1px solid #333", cursor: "pointer", letterSpacing: 0.5, fontFamily: "inherit", fontSize: 12 },
};

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
