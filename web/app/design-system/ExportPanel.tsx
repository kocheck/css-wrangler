"use client";

import { useMemo, useState } from "react";
import styles from "./ExportPanel.module.css";
import { TOKEN_BY_VAR, type TokenOverrides } from "./tokens";

interface Props {
  overrides: TokenOverrides;
  onReset: () => void;
}

interface YamlGroup {
  section: string;
  entries: { key: string; value: string }[];
}

function buildYamlGroups(overrides: TokenOverrides): YamlGroup[] {
  const bySection = new Map<string, { key: string; value: string }[]>();
  for (const [cssVar, value] of Object.entries(overrides)) {
    const token = TOKEN_BY_VAR[cssVar];
    if (!token) continue;
    const [section, key] = token.yamlPath.split(".");
    if (!section || !key) continue;
    const list = bySection.get(section) ?? [];
    list.push({ key, value });
    bySection.set(section, list);
  }
  return Array.from(bySection.entries()).map(([section, entries]) => ({
    section,
    entries: entries.sort((a, b) => a.key.localeCompare(b.key)),
  }));
}

function quoteIfNeeded(value: string): string {
  if (value === "0" || /^-?\d+(\.\d+)?(px|em|rem|%|ms|s)?$/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '\\"')}"`;
}

function renderYaml(groups: YamlGroup[]): string {
  if (groups.length === 0) return "# No overrides yet — every token at its default.";
  return groups
    .map((g) => {
      const lines = g.entries.map((e) => `  ${quoteIfNeeded(e.key)}: ${quoteIfNeeded(e.value)}`);
      return `${g.section}:\n${lines.join("\n")}`;
    })
    .join("\n");
}

export function ExportPanel({ overrides, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const groups = useMemo(() => buildYamlGroups(overrides), [overrides]);
  const yaml = useMemo(() => renderYaml(groups), [groups]);
  const editedCount = Object.keys(overrides).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard blocked — leave UI silent; the user can select the textarea.
    }
  };

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.headerLine}>
          <span className={styles.title}>· Export</span>
          <span className={styles.count} data-empty={editedCount === 0}>
            {editedCount === 0
              ? "0 overrides"
              : `${editedCount} override${editedCount === 1 ? "" : "s"}`}
          </span>
        </div>
        <p className={styles.note}>
          Paste into <code>DESIGN.md</code> frontmatter, then run <code>pnpm tokens</code>.
        </p>
      </header>

      <pre className={styles.yaml}>{yaml}</pre>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={handleCopy}
          disabled={editedCount === 0}
          data-state={copied ? "copied" : "idle"}
        >
          {copied ? "Copied →" : "Copy YAML"}
          <span className={styles.copyBadge}>YAML</span>
        </button>
        <button
          type="button"
          className={styles.resetBtn}
          onClick={onReset}
          disabled={editedCount === 0}
        >
          Reset all
        </button>
      </div>
    </aside>
  );
}
