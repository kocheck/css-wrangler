import styles from "./Previews.module.css";

interface SpecimenProps {
  name: string;
  cssVar: string;
  fontFamily: "mono" | "ui";
  sample: string;
  weight?: number;
  letterSpacing?: string;
  lineHeight?: string;
}

const ROWS: SpecimenProps[] = [
  {
    name: "headline-lg",
    cssVar: "--type-headline-lg",
    fontFamily: "mono",
    sample: "Edit any site's CSS.",
    weight: 500,
    letterSpacing: "var(--tracking-tight)",
    lineHeight: "var(--leading-tight)",
  },
  {
    name: "headline-sm",
    cssVar: "--type-headline-sm",
    fontFamily: "mono",
    sample: "Hand the diff to Claude.",
    weight: 500,
    letterSpacing: "var(--tracking-tight)",
    lineHeight: "var(--leading-tight)",
  },
  {
    name: "display",
    cssVar: "--type-display",
    fontFamily: "mono",
    sample: "// CSS WRANGLER",
    weight: 600,
    letterSpacing: "var(--tracking-caps)",
  },
  {
    name: "data",
    cssVar: "--type-data",
    fontFamily: "mono",
    sample: "padding-inline: 16px → 24px",
  },
  {
    name: "body",
    cssVar: "--type-body",
    fontFamily: "ui",
    sample: "Pick a node. Tweak its CSS. Copy the patch into Claude Code.",
    lineHeight: "var(--leading-normal)",
  },
  {
    name: "label",
    cssVar: "--type-label",
    fontFamily: "ui",
    sample: "Pick element",
    weight: 500,
    letterSpacing: "var(--tracking-wide)",
  },
  {
    name: "section",
    cssVar: "--type-section",
    fontFamily: "mono",
    sample: "READY TO PUSH · 4 CHANGES",
    weight: 600,
    letterSpacing: "var(--tracking-caps)",
  },
  {
    name: "caption",
    cssVar: "--type-caption",
    fontFamily: "mono",
    sample: "tailwindcss.com · TAILWIND DETECTED",
    letterSpacing: "var(--tracking-wide)",
  },
  {
    name: "micro",
    cssVar: "--type-micro",
    fontFamily: "mono",
    sample: "v0.1 · ALPHA",
    letterSpacing: "var(--tracking-wide)",
  },
];

export function TypeSpecimen() {
  return (
    <div className={styles.frame}>
      <div className={styles.frameLabel}>
        <span>· Type · Live specimens</span>
        <span className={styles.frameDim}>{ROWS.length} sizes</span>
      </div>
      <div className={styles.specimen}>
        {ROWS.map((row) => (
          <div key={row.name} className={styles.specimenRow}>
            <div className={styles.specimenMeta}>
              <span className={styles.specimenName}>{row.name}</span>
              <span>{row.cssVar}</span>
              <span style={{ textTransform: "uppercase" }}>{row.fontFamily}</span>
            </div>
            <span
              style={{
                fontFamily: row.fontFamily === "mono" ? "var(--font-mono)" : "var(--font-ui)",
                fontSize: `var(${row.cssVar})`,
                fontWeight: row.weight ?? 400,
                letterSpacing: row.letterSpacing,
                lineHeight: row.lineHeight ?? "var(--leading-tight)",
                color: "var(--fg-primary)",
              }}
            >
              {row.sample}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
