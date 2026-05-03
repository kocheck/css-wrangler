import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, type ReactNode, cache } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { codeToHast } from "shiki";
import styles from "./PatchExample.module.css";
import { examplePatch } from "./patch-example-data";

const highlightJson = cache(async (code: string): Promise<ReactNode> => {
  try {
    const tree = await codeToHast(code, { lang: "json", theme: "vesper" });
    return toJsxRuntime(tree, { Fragment, jsx, jsxs });
  } catch (err) {
    console.error("[PatchExample] Shiki highlight failed; falling back to plain code", err);
    return <pre>{code}</pre>;
  }
});

export async function PatchExample() {
  const json = JSON.stringify(examplePatch, null, 2);
  const highlighted = await highlightJson(json);

  return (
    <section className={styles.section}>
      <p className={styles.eyebrow}>{"THE PATCH FORMAT · v1.0"}</p>
      <div className={styles.code}>{highlighted}</div>
      <p className={styles.trailing}>
        Versioned at 1.0. We&rsquo;re optimistic. Pattern-matched downstream by Claude Code; the
        shape doesn&rsquo;t change without a major bump.
      </p>
    </section>
  );
}
