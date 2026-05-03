import styles from "./FeatureRow.module.css";

type Feature = {
  num: string;
  title: string;
  body: string;
};

const features: Feature[] = [
  {
    num: "·01",
    title: "PICK",
    body: "Pick any element. Keyboard-navigable DOM walker. Works on any page. The fancy ones too.",
  },
  {
    num: "·02",
    title: "PREVIEW",
    body: "Live preview via injected style + unique class. Wins specificity wars without asking.",
  },
  {
    num: "·03",
    title: "PATCH",
    body: "Markdown-fenced JSON on your clipboard. Versioned. Agent-ready. Boringly stable.",
  },
];

export function FeatureRow() {
  return (
    <section className={styles.grid}>
      {features.map((f) => (
        <div key={f.num} className={styles.cell}>
          <h2 className={styles.heading}>
            <span className={styles.num}>{f.num}</span>
            <span className={styles.title}>{f.title}</span>
          </h2>
          <p className={styles.body}>{f.body}</p>
        </div>
      ))}
    </section>
  );
}
