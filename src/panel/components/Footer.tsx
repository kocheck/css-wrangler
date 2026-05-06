import { useMemo, useState } from "react";
import { copyToClipboard } from "../lib/clipboard";
import { pushPatch } from "../lib/mcp-push";
import { buildPatch, buildPatchMarkdown } from "../lib/patch";
import { useEditStore } from "../store/editStore";

interface CopiedSnapshot {
  json: string;
  bytes: number;
}

export default function Footer() {
  const edits = useEditStore((s) => s.edits);
  const url = useEditStore((s) => s.url);
  const stylingSystem = useEditStore((s) => s.stylingSystem);
  const [state, setState] = useState<"idle" | "copied">("idle");
  const [snapshot, setSnapshot] = useState<CopiedSnapshot | null>(null);

  const totalChanges = edits.reduce((acc, e) => acc + e.changes.length, 0);
  const groupCount = useMemo(() => {
    const groups = new Set<string>();
    for (const e of edits) if (e.siblingGroup) groups.add(e.siblingGroup);
    return groups.size;
  }, [edits]);

  const preview = state === "copied" ? snapshot : null;

  async function onCopy() {
    if (totalChanges === 0) return;
    const patch = buildPatch({ url, stylingSystem, edits });
    const json = JSON.stringify(patch, null, 2);
    const md = buildPatchMarkdown({ url, stylingSystem, edits });
    const ok = await copyToClipboard(md);
    // Fire-and-forget MCP push. No-ops if the daemon isn't running — the
    // clipboard write above is still the user's working path.
    // TODO: auto-push from editStore (debounced) so Claude Code stays in
    // sync without a manual click.
    pushPatch(patch);
    if (ok) {
      const bytes = new TextEncoder().encode(json).length;
      setSnapshot({ json, bytes });
      setState("copied");
      window.setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <>
      {preview && (
        <div className="patch-preview">
          <div className="patch-preview-header">
            <div className="patch-status">
              <span className="dot" />
              <span>COPIED TO CLIPBOARD</span>
            </div>
            <span className="patch-meta">v1.0 · {preview.bytes} bytes</span>
          </div>
          <pre className="patch-json">{preview.json}</pre>
          <div className="paste-hint">Paste into Claude Code · ⌘V</div>
        </div>
      )}
      <footer className="footer">
        <div className="footer-meta">
          <span>
            <span className="count">{edits.length}</span> ELEMENT{edits.length === 1 ? "" : "S"}
          </span>
          <span className="footer-divider" aria-hidden="true" />
          <span>
            <span className="count">{totalChanges}</span> CHANGES
          </span>
          {groupCount > 0 && (
            <>
              <span className="footer-divider" aria-hidden="true" />
              <span>
                <span className="count">{groupCount}</span> GROUP{groupCount === 1 ? "" : "S"}
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          className="copy-patch"
          data-state={state}
          disabled={totalChanges === 0}
          onClick={() => void onCopy()}
        >
          {state === "copied" && (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M2 5l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="square"
              />
            </svg>
          )}
          <span>{state === "copied" ? "COPIED" : "COPY PATCH"}</span>
          <span className="badge">JSON</span>
        </button>
      </footer>
    </>
  );
}
