import { StationFrame } from "@/app/components/StationFrame";
import styles from "./Modules.module.css";

export default function ModulesStationPage() {
  return (
    <StationFrame
      stationNumber="03"
      stationName="CSS MODULES"
      testsBox="CSS Modules. Mangled `Name_class__hash` -> meaningful selector. The denylist must extract, not reject."
    >
      <div className={styles.dashboard}>
        <header className={styles.hero}>
          <div>
            <h2 className={styles.heroTitle}>Operations overview</h2>
            <p className={styles.heroBody}>
              Last 24 hours, all regions. Numbers are illustrative; the classes are the test
              substrate.
            </p>
          </div>
        </header>

        <div className={styles.cardRow}>
          <article className={styles.card}>
            <p className={styles.cardLabel}>Active sessions</p>
            <p className={styles.cardValue}>4,182</p>
            <p className={styles.cardDelta}>+8.4% vs prior</p>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>P95 latency</p>
            <p className={styles.cardValue}>142ms</p>
            <p className={`${styles.cardDelta} ${styles.cardDeltaDown}`}>+12ms vs prior</p>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>Patches copied</p>
            <p className={styles.cardValue}>1,209</p>
            <p className={styles.cardDelta}>+22.0% vs prior</p>
          </article>

          <article className={styles.card}>
            <p className={styles.cardLabel}>Error rate</p>
            <p className={styles.cardValue}>0.04%</p>
            <p className={styles.cardDelta}>-0.01pp vs prior</p>
          </article>
        </div>
      </div>
    </StationFrame>
  );
}
