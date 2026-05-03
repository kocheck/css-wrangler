import styles from "./TopBar.module.css";

export function TopBar() {
  return (
    <header className={styles.bar}>
      <span className={styles.wordmark}>{"// CSS WRANGLER"}</span>
      <span className={styles.pill}>{"v0.1 · ALPHA"}</span>
    </header>
  );
}
