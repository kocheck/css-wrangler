import styles from "./Previews.module.css";

export function PluginPreview() {
  return (
    <div className={styles.frame}>
      <div className={styles.frameLabel}>
        <span>· Plugin · Figma bridge</span>
        <span className={styles.frameDim}>320 px</span>
      </div>
      <div className={styles.frameBody}>
        <div className={styles.plugin}>
          <header className={styles.pluginHeader}>
            <span className={styles.pluginBrand}>CSS Wrangler · Bridge</span>
            <span className={styles.pluginPill}>
              <span className={styles.statusDot} />
              CONNECTED
            </span>
          </header>

          <section className={styles.pluginSection}>
            <span className={styles.pluginLabel}>Figma target</span>
            <span className={styles.pluginTarget}>frame "hero-cta"</span>
          </section>

          <section className={styles.pluginSection}>
            <span className={styles.pluginLabel}>Browser target</span>
            <span className={styles.pluginTarget}>button.btn-primary</span>
          </section>

          <section className={styles.pluginSection}>
            <span className={styles.pluginLabel}>Ready to push · 3 changes</span>
            <ul className={styles.pluginList}>
              <li className={styles.pluginRow}>
                <span>background-color</span>
                <span className={styles.pluginValue}>#FF3D00</span>
              </li>
              <li className={styles.pluginRow}>
                <span>padding-inline</span>
                <span className={styles.pluginValue}>24px</span>
              </li>
              <li className={styles.pluginRow}>
                <span>border-radius</span>
                <span className={styles.pluginValue}>2px</span>
              </li>
            </ul>
          </section>

          <footer className={styles.pluginFooter}>
            <button type="button" className={styles.pushButton}>
              <span>Push to browser</span>
              <span className={styles.pushArrow}>→</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
