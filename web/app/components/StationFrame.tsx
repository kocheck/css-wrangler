import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./StationFrame.module.css";

type Props = {
  stationNumber: string;
  stationName: string;
  testsBox: string;
  children: ReactNode;
};

export function StationFrame({ stationNumber, stationName, testsBox, children }: Props) {
  return (
    <div className={styles.frame}>
      <header className={styles.topBar}>
        <h1 className={styles.title}>
          <span className={styles.titleStation}>{"STATION"}</span>
          <span className={styles.titleSep}>{" · "}</span>
          <span className={styles.titleNumber}>{`·${stationNumber}`}</span>
          <span className={styles.titleSep}>{" · "}</span>
          <span className={styles.titleName}>{stationName}</span>
        </h1>

        <aside className={styles.testsBox} aria-label="What this tests">
          <p className={styles.testsLabel}>{"WHAT THIS TESTS"}</p>
          <p className={styles.testsBody}>{testsBox}</p>
        </aside>
      </header>

      <section className={styles.body}>{children}</section>

      <footer className={styles.bottomBar}>
        <Link href="/lab" className={styles.returnLink}>
          {"← /lab"}
        </Link>
      </footer>
    </div>
  );
}
