export default function BlockedScreen() {
  return (
    <div className="blocked-screen">
      <div className="icon" aria-hidden="true">
        !
      </div>
      <div className="title">Page not wranglable</div>
      <div className="body">
        Chrome internal pages and the Web Store can't accept content scripts. Switch to any other
        tab and re-open the panel.
      </div>
    </div>
  );
}
