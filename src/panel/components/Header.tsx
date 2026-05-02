import { useEditStore } from "../store/editStore";

export default function Header() {
  const url = useEditStore((s) => s.url);
  const stylingSystem = useEditStore((s) => s.stylingSystem);
  const pickActive = useEditStore((s) => s.pickActive);
  const contentReady = useEditStore((s) => s.contentReady);
  const editsCount = useEditStore((s) => s.edits.length);
  const clearAll = useEditStore((s) => s.clearAll);

  let status: "ready" | "picking" | "blocked" = "ready";
  let statusLabel = "READY";
  if (pickActive) {
    status = "picking";
    statusLabel = "PICKING";
  } else if (!contentReady) {
    status = "blocked";
    statusLabel = "OFFLINE";
  }

  let displayUrl = "—";
  let host = "";
  try {
    if (url) {
      const u = new URL(url);
      host = u.host;
      displayUrl = `${u.host}${u.pathname}`;
    }
  } catch {
    displayUrl = url;
  }

  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <span>CSS Wrangler</span>
      </div>
      <span className="status-pill" data-status={status}>
        <span className="dot" /> {statusLabel}
      </span>
      <button
        type="button"
        className="clear-all"
        onClick={() => void clearAll()}
        disabled={editsCount === 0}
      >
        Clear all
      </button>
      <div className="url-row">
        <span className="label">SRC</span>
        <span className="url" title={url}>
          {displayUrl}
        </span>
        {host && <span className="system">{stylingSystem.toUpperCase()}</span>}
      </div>
    </header>
  );
}
