import styles from "./Footer.module.css";

function getBuildHash(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!sha) return "local";
  return sha.slice(0, 7);
}

export function Footer() {
  const hash = getBuildHash();
  return (
    <footer className={styles.footer}>
      <div className={styles.row}>
        <span className={styles.left}>
          {"// CSS WRANGLER · v0.1 · MIT · 2026 · "}
          <a
            href="https://github.com/kylekochanek/css-wrangler"
            target="_blank"
            rel="noreferrer noopener"
          >
            github
          </a>
          {" · "}
          <a href="/lab">/lab</a>
        </span>
        <span className={styles.right}>{`· build ${hash}`}</span>
      </div>
      <p className={styles.disclaimer}>No analytics. No telemetry. No newsletter. No Twitter.</p>
    </footer>
  );
}
