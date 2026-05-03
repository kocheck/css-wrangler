import styles from "./InstallSection.module.css";

type Step = {
  marker: string;
  cmd: string;
};

const steps: Step[] = [
  { marker: "·01", cmd: "pnpm install && pnpm build" },
  {
    marker: "·02",
    cmd: "chrome://extensions → developer mode → load unpacked → pick dist/",
  },
  {
    marker: "·03",
    cmd: "click the toolbar icon, side panel opens, click PICK ELEMENT",
  },
];

export function InstallSection() {
  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>{"INSTALL · v0.1 ALPHA"}</p>
      <ol className={styles.list}>
        {steps.map((s) => (
          <li key={s.marker} className={styles.item}>
            <span className={styles.marker}>{s.marker}</span>
            <span className={styles.cmd}>{s.cmd}</span>
          </li>
        ))}
      </ol>
      <p className={styles.closing}>
        When CSS Wrangler ships to the Chrome Web Store, this section becomes a single button. Until
        then, three steps. You&rsquo;ll live.
      </p>
    </section>
  );
}
