import styles from "./Previews.module.css";

export function HeroPreview() {
  return (
    <div className={styles.frame}>
      <div className={styles.frameLabel}>
        <span>· Web · Landing hero</span>
        <span className={styles.frameDim}>640 px column</span>
      </div>
      <div className={styles.frameBody}>
        <section className={styles.hero}>
          <header className={styles.heroTopBar}>
            <span className={styles.heroWordmark}>{"// CSS WRANGLER"}</span>
            <span className={styles.heroPill}>v0.1 · ALPHA</span>
          </header>
          <p className={styles.heroEyebrow}>PICK · TWEAK · SHIP</p>
          <h1 className={styles.heroHeadline}>
            <span>Edit any site's CSS</span>
            <span>
              and hand the diff to <span className={styles.heroAccent}>Claude</span>.
            </span>
          </h1>
          <p className={styles.heroBody}>
            A Chrome extension that turns visual CSS edits into a structured patch. Your AI agent
            applies it on the first try, which still feels like cheating.
          </p>
          <p className={styles.heroSecondary}>The DevTools-edit-and-grep-and-pray loop, retired.</p>
          <div className={styles.heroCtaRow}>
            <button type="button" className={styles.ctaPrimary}>
              ▸ Coming soon · Chrome Web Store
            </button>
            <a
              className={styles.ctaSecondary}
              href="https://github.com/kocheck/css-wrangler"
              target="_blank"
              rel="noreferrer noopener"
            >
              View on GitHub →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
