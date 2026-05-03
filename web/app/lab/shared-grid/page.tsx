import { StationFrame } from "@/app/components/StationFrame";
import styles from "./shared-grid.module.css";

type Card = {
  title: string;
  body: string;
  date: string;
};

const CARDS: Card[] = [
  {
    title: "Field notes from a week without a designer",
    body: "An engineer-led product team tries to ship a marketing page on its own and learns three uncomfortable things.",
    date: "MAR 04",
  },
  {
    title: "Why the patch is the artifact",
    body: "Screenshots get stale, Figma comments get archived. A structured diff is the only review surface that survives the merge.",
    date: "MAR 09",
  },
  {
    title: "The case against your CSS-in-JS rewrite",
    body: "Before you migrate the codebase, count the number of edits that actually need props. The answer is usually small.",
    date: "MAR 12",
  },
  {
    title: "Twelve cards in search of a sibling group",
    body: "How the picker decides whether two elements are siblings, cousins, or just dressed alike for the photo.",
    date: "MAR 16",
  },
  {
    title: "An interview with our oldest stylesheet",
    body: "It still has IE6 hacks. It still works. We asked it for advice on cascade order and it told us to read the spec.",
    date: "MAR 19",
  },
  {
    title: "Three failure modes of utility classes",
    body: "When grep stops working, when refactors stall, and when the design system slowly becomes a synonym for `bg-zinc-900`.",
    date: "MAR 23",
  },
  {
    title: "Specificity is a budget, not a goal",
    body: "Every `!important` you add is a future ticket. Every nested selector is a quiet promise to your future self.",
    date: "MAR 26",
  },
  {
    title: "Notes on shipping without a staging review",
    body: "We removed the staging gate for a quarter to see what would happen. What happened was mostly fine, and that was instructive.",
    date: "MAR 28",
  },
  {
    title: "How we handle the design-engineering handoff",
    body: "Spoiler: we mostly do not. The handoff is replaced by a shared canvas and a willingness to fix the other person's mistakes.",
    date: "APR 02",
  },
  {
    title: "Picking the right element is half the work",
    body: "A short essay on why the picker matters more than the editor, and why we spent a month on a crosshair.",
    date: "APR 05",
  },
  {
    title: "What we learned auditing 400 production sites",
    body: "The good news: most pages are mostly accessible. The bad news: the gaps cluster in predictable places.",
    date: "APR 09",
  },
  {
    title: "An incomplete list of CSS features we never use",
    body: "Container queries, subgrid, anchor positioning. We promise to try harder. We have promised this before.",
    date: "APR 14",
  },
];

export default function SharedGridStationPage() {
  return (
    <StationFrame
      stationNumber="07"
      stationName="SHARED-CLASS GRID"
      testsBox="Twelve siblings, one shared class. Edits should propose a sibling group; the patch should set `siblingGroup`, not `null`."
    >
      <div className={styles.grid}>
        {CARDS.map((card) => (
          <article key={card.title} className={styles.card}>
            <div className={styles.image} />
            <h3 className={styles.title}>{card.title}</h3>
            <p className={styles.body}>{card.body}</p>
            <footer className={styles.footer}>
              <span>{card.date}</span>
              <span>READ MORE</span>
            </footer>
          </article>
        ))}
      </div>
    </StationFrame>
  );
}
