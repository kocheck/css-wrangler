import styles from "./Page.module.css";
import { FeatureRow } from "./components/FeatureRow";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { InstallSection } from "./components/InstallSection";
import { PatchExample } from "./components/PatchExample";
import { TopBar } from "./components/TopBar";

export default function HomePage() {
  return (
    <>
      <TopBar />
      <main className={styles.main}>
        <Hero />
        <FeatureRow />
        <PatchExample />
        <InstallSection />
      </main>
      <Footer />
    </>
  );
}
