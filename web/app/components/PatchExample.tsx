import styles from "./PatchExample.module.css";

const PATCH_JSON = `{
  "version": "1.0",
  "source": "css-wrangler",
  "url": "https://example.com",
  "capturedAt": "2026-05-03T17:42:11.000Z",
  "stylingSystem": "tailwind",
  "breakpoints": { "mobile": 640, "tablet": 768, "desktop": 1024 },
  "edits": [
    {
      "siblingGroup": null,
      "element": {
        "tag": "button",
        "text": "Get started",
        "role": "button",
        "ariaLabel": null,
        "selectors": [
          { "type": "class", "value": ".hero-cta", "stability": "high" }
        ],
        "domPath": "main > section.hero > button.hero-cta"
      },
      "changes": [
        { "property": "padding", "from": "12px 24px", "to": "16px 32px" }
      ]
    }
  ]
}`;

export function PatchExample() {
  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>{"THE PATCH FORMAT · v1.0"}</p>
      <pre className={styles.frame}>
        <code className={styles.code}>{PATCH_JSON}</code>
      </pre>
      <p className={styles.trailing}>
        Versioned at 1.0. We&rsquo;re optimistic. Pattern-matched downstream by Claude Code; the
        shape doesn&rsquo;t change without a major bump.
      </p>
    </section>
  );
}
