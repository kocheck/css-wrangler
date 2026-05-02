import { useState } from "react";
import { copyToClipboard } from "../lib/clipboard";
import { buildPatchMarkdown } from "../lib/patch";
import { useEditStore } from "../store/editStore";

export default function Footer() {
  const edits = useEditStore((s) => s.edits);
  const url = useEditStore((s) => s.url);
  const stylingSystem = useEditStore((s) => s.stylingSystem);
  const [state, setState] = useState<"idle" | "copied">("idle");

  const totalChanges = edits.reduce((acc, e) => acc + e.changes.length, 0);

  async function onCopy() {
    if (totalChanges === 0) return;
    const md = buildPatchMarkdown({ url, stylingSystem, edits });
    const ok = await copyToClipboard(md);
    if (ok) {
      setState("copied");
      window.setTimeout(() => setState("idle"), 1400);
    }
  }

  return (
    <footer className="footer">
      <div className="footer-meta">
        <span>
          <span className="count">{edits.length}</span> ELEMENTS
        </span>
        <span>
          <span className="count">{totalChanges}</span> CHANGES
        </span>
      </div>
      <button
        type="button"
        className="copy-patch"
        data-state={state}
        disabled={totalChanges === 0}
        onClick={() => void onCopy()}
      >
        <span>{state === "copied" ? "COPIED" : "COPY PATCH"}</span>
        <span className="badge">JSON</span>
      </button>
    </footer>
  );
}
