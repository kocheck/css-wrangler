import { Footer } from "@/app/components/Footer";
import { TopBar } from "@/app/components/TopBar";
import type { Route } from "next";
import Link from "next/link";
import styles from "./lab-index.module.css";

type Station = {
  num: string;
  name: string;
  desc: string;
  href: Route;
};

// Five of the eight station routes don't exist yet (Phase 4 work). Their hrefs
// are cast to `Route` so the typed-routes check passes; visiting them in dev
// will 404, which is expected per the Phase 3 brief.
const STATIONS: Station[] = [
  { num: "·01", name: "PLAIN CSS", desc: "hand-written semantic classes", href: "/lab/plain" },
  {
    num: "·02",
    name: "TAILWIND UTILITIES",
    desc: "mass utility-class detection + hints",
    href: "/lab/tailwind" as Route,
  },
  {
    num: "·03",
    name: "CSS MODULES",
    desc: "mangled `Name_class__hash` extraction",
    href: "/lab/modules" as Route,
  },
  {
    num: "·04",
    name: "CSS-IN-JS",
    desc: "styled-components `sc-*` denylist",
    href: "/lab/css-in-js" as Route,
  },
  { num: "·05", name: "INLINE STYLES", desc: "structural-selector fallback", href: "/lab/inline" },
  {
    num: "·06",
    name: "DEEP DOM",
    desc: "walker + observer + position:fixed",
    href: "/lab/deep-dom" as Route,
  },
  {
    num: "·07",
    name: "SHARED-CLASS GRID",
    desc: "sibling-group detection",
    href: "/lab/shared-grid" as Route,
  },
  {
    num: "·08",
    name: "IMPORTANT WARS",
    desc: "page-level !important — extension wins",
    href: "/lab/important-wars",
  },
];

export default function LabPage() {
  return (
    <>
      <TopBar />
      <main className={styles.main}>
        <p className={styles.eyebrow}>{"THE LAB · CSS WRANGLER"}</p>

        <div className={styles.intro}>
          <p>
            This page exists to exercise every code path in the picker, selector ranking, denylist,
            styling-detect, injector, and observer across every styling system the extension
            supports. It also doubles as the regression harness, because writing tests for a Chrome
            extension is its own kind of misery.
          </p>
          <p>
            Open the side panel. Pick anything. Copy a patch. If a station behaves wrong, that
            station&rsquo;s source is your regression test. You&rsquo;re welcome.
          </p>
        </div>

        <hr className={styles.rule} />

        <ol className={styles.stations}>
          {STATIONS.map((s) => (
            <li key={s.num}>
              <Link href={s.href} className={styles.row}>
                <span className={styles.num}>{s.num}</span>
                <span className={styles.name}>{s.name}</span>
                <span className={styles.desc}>{s.desc}</span>
              </Link>
            </li>
          ))}
        </ol>

        <hr className={styles.rule} />

        <p className={styles.contract}>
          If you change <code>selectors.ts</code>, <code>injector.ts</code>, or{" "}
          <code>styling-detect.ts</code>, update or add a station. See <code>web/CLAUDE.md</code>.
          The contract is in writing for a reason.
        </p>
      </main>
      <Footer />
    </>
  );
}
