import styles from "./InstallCTA.module.css";

export function InstallCTA() {
  return (
    <div className={styles.row}>
      <span className={styles.tooltipWrap}>
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-describedby="install-cta-tooltip"
          className={`${styles.btnBase} ${styles.primary}`}
        >
          {"▸ COMING SOON · CHROME WEB STORE"}
        </button>
        <span id="install-cta-tooltip" role="tooltip" className={styles.tooltip}>
          Pending Chrome Web Store review. Allegedly imminent. Build from source meanwhile.
        </span>
      </span>
      <a
        href="https://github.com/kylekochanek/css-wrangler"
        target="_blank"
        rel="noreferrer noopener"
        className={`${styles.btnBase} ${styles.secondary}`}
      >
        {"▸ VIEW ON GITHUB"}
      </a>
    </div>
  );
}
