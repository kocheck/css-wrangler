import styles from "./InstallCTA.module.css";
import { ExternalLink } from "./icons/ExternalLink";
import { GitHub } from "./icons/GitHub";

export function InstallCTA() {
  return (
    <div className={styles.row}>
      <span className={styles.tooltipWrap}>
        <button
          type="button"
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
        href="https://github.com/kocheck/css-wrangler"
        target="_blank"
        rel="noreferrer noopener"
        className={`${styles.btnBase} ${styles.secondary}`}
      >
        <GitHub width={12} height={12} />
        {"VIEW ON GITHUB"}
        <ExternalLink width={10} height={10} />
      </a>
    </div>
  );
}
