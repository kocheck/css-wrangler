import { useEditStore } from "../store/editStore";
import BridgeStatusPill from "./BridgeStatus";

export default function Header() {
  const url = useEditStore((s) => s.url);
  const stylingSystem = useEditStore((s) => s.stylingSystem);
  const pickActive = useEditStore((s) => s.pickActive);
  const contentReady = useEditStore((s) => s.contentReady);
  const editsCount = useEditStore((s) => s.edits.length);
  const clearAll = useEditStore((s) => s.clearAll);
  const otherSide = useEditStore((s) => s.otherSideTarget);
  const bridgeNotice = useEditStore((s) => s.bridgeNotice);

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
      <output
        className="status-pill"
        data-status={status}
        aria-label={`Picker status: ${statusLabel.toLowerCase()}`}
      >
        <span className="dot" aria-hidden="true" /> {statusLabel}
      </output>
      <BridgeStatusPill />
      <button
        type="button"
        className="clear-all"
        onClick={() => void clearAll()}
        disabled={editsCount === 0}
      >
        Clear all
      </button>
      {otherSide && (
        <div className="other-side-row">
          <span className="label">FIGMA</span>
          <span className="other-target" title={otherSide.display}>
            {otherSide.display}
          </span>
        </div>
      )}
      {bridgeNotice && <div className="bridge-notice">{bridgeNotice}</div>}
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
