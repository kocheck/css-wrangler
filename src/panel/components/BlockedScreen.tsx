const BLOCKED_SCHEMES = [
  "chrome://*",
  "chrome-extension://*",
  "chromewebstore.google.com",
  "view-source:*",
];

export default function BlockedScreen() {
  return (
    <div className="blocked-screen">
      <div className="blocked-emblem" aria-hidden="true">
        <span className="ring outer" />
        <span className="ring middle" />
        <span className="ring inner">
          <span className="bang">!</span>
        </span>
        <span className="tick tick-l" />
        <span className="tick tick-r" />
        <span className="tick tick-t" />
        <span className="tick tick-b" />
      </div>
      <div className="err-pill">
        <span className="err-label">ERR</span>
        <span className="err-code">CONTENT_SCRIPT_BLOCKED</span>
      </div>
      <div className="title">Page not wranglable</div>
      <div className="body">
        Chrome internal pages and the Web Store can't accept content scripts. Switch to any other
        tab and re-open the panel.
      </div>
      <div className="blocked-schemes">
        <div className="schemes-label">BLOCKED SCHEMES</div>
        <ul>
          {BLOCKED_SCHEMES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
