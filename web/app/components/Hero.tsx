import styles from "./Hero.module.css";
import { InstallCTA } from "./InstallCTA";

export function Hero() {
  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>{"PICK · TWEAK · SHIP"}</p>
      <h1 className={styles.headline}>
        <span>Edit any site&rsquo;s CSS</span>
        <span>
          and hand the diff to <span className={styles.accent}>Claude</span>.
        </span>
      </h1>
      <p className={styles.body}>
        A Chrome extension that turns visual CSS edits into a structured patch. Your AI agent
        applies it on the first try, which still feels like cheating.
      </p>
      <p className={styles.secondary}>The DevTools-edit-and-grep-and-pray loop, retired.</p>
      <div className={styles.cta}>
        <InstallCTA />
      </div>
    </section>
  );
}
