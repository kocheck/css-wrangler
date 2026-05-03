import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./StationFrame.module.css";
import { TopBar } from "./TopBar";

type Props = {
  stationNumber: string;
  stationName: string;
  testsBox: string;
  children: ReactNode;
};

function BackToLab() {
  return (
    <Link href="/lab" className={styles.returnLink}>
      <span className={styles.returnArrow} aria-hidden="true">
        ←
      </span>
      BACK TO LAB
    </Link>
  );
}

export function StationFrame({ stationNumber, stationName, testsBox, children }: Props) {
  return (
    <div className={styles.frame}>
      <TopBar />

      <header className={styles.titleBar}>
        <div className={styles.titleStack}>
          <p className={styles.eyebrow}>
            STATION <span className={styles.eyebrowNumber}>{`·${stationNumber}`}</span>
          </p>
          <h1 className={styles.heading}>{stationName}</h1>
        </div>
        <BackToLab />
      </header>

      <section className={styles.tests} aria-labelledby="station-tests-label">
        <p id="station-tests-label" className={styles.testsLabel}>
          {"WHAT THIS TESTS"}
        </p>
        <p className={styles.testsBody}>{testsBox}</p>
      </section>

      <section className={styles.body}>{children}</section>

      <footer className={styles.bottomBar}>
        <BackToLab />
      </footer>
    </div>
  );
}
