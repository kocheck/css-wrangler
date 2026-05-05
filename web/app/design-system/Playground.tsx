"use client";

import { useMemo } from "react";
import { ExportPanel } from "./ExportPanel";
import styles from "./Playground.module.css";
import { StyleInjector } from "./StyleInjector";
import { TokenStrip } from "./controls/TokenStrip";
import { HeroPreview } from "./previews/HeroPreview";
import { PanelPreview } from "./previews/PanelPreview";
import { PluginPreview } from "./previews/PluginPreview";
import { TypeSpecimen } from "./previews/TypeSpecimen";
import { useTokenOverrides } from "./store";
import { TOKENS, type TokenDef } from "./tokens";

interface Group {
  id: TokenDef["group"];
  label: string;
  caption: string;
}

const GROUPS: Group[] = [
  { id: "color-fg", label: "FG · Foreground", caption: "Text steps · primary → quaternary" },
  { id: "color-bg", label: "BG · Background", caption: "App ground + elevation steps" },
  { id: "color-border", label: "BD · Borders", caption: "Hairline · strong" },
  { id: "color-accent", label: "AC · Accents", caption: "Signal · applied · diverges" },
  { id: "type", label: "TY · Type sizes", caption: "9 → 32 px · panel + landing" },
  { id: "tracking", label: "TR · Tracking", caption: "Letter-spacing scale" },
  { id: "leading", label: "LH · Leading", caption: "Line-height ratios" },
  { id: "spacing", label: "SP · Spacing", caption: "4px baseline · 1 → 9" },
  { id: "rounded", label: "RD · Radius", caption: "1 → 2 px · anything more reads SaaS" },
  { id: "motion", label: "MO · Motion", caption: "Fast · base · slow" },
  { id: "ease", label: "EZ · Ease", caption: "Sharp out, gentle in" },
];

export function Playground() {
  const { overrides, set, reset, resetOne, hydrated } = useTokenOverrides();

  const editedCount = Object.keys(overrides).length;

  const grouped = useMemo(() => {
    const map = new Map<TokenDef["group"], TokenDef[]>();
    for (const t of TOKENS) {
      const list = map.get(t.group) ?? [];
      list.push(t);
      map.set(t.group, list);
    }
    return map;
  }, []);

  return (
    <>
      <StyleInjector overrides={overrides} />
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <span className={styles.wordmark}>{"// CSS WRANGLER"}</span>
            <span className={styles.routePill}>· tuning console</span>
          </div>
          <div className={styles.topbarRight}>
            <span className={styles.metric}>
              <span className={styles.metricLabel}>OVRRD</span>
              <span className={styles.metricValue} data-active={editedCount > 0}>
                {String(editedCount).padStart(2, "0")}
              </span>
            </span>
            <span className={styles.metric}>
              <span className={styles.metricLabel}>TOKENS</span>
              <span className={styles.metricValue}>{TOKENS.length}</span>
            </span>
            <span className={styles.metric}>
              <span className={styles.metricLabel}>STATE</span>
              <span className={styles.metricValue} data-flag={hydrated ? "live" : "idle"}>
                {hydrated ? "LIVE" : "BOOT"}
              </span>
            </span>
          </div>
        </header>

        <div className={styles.body} data-tuning="">
          <aside className={styles.controlRail}>
            {GROUPS.map((g) => {
              const tokens = grouped.get(g.id) ?? [];
              if (tokens.length === 0) return null;
              return (
                <section key={g.id} className={styles.group}>
                  <header className={styles.groupHeader}>
                    <span className={styles.groupLabel}>{g.label}</span>
                    <span className={styles.groupCaption}>{g.caption}</span>
                  </header>
                  <div className={styles.groupBody}>
                    {tokens.map((t) => (
                      <TokenStrip
                        key={t.cssVar}
                        token={t}
                        value={overrides[t.cssVar] ?? t.default}
                        onChange={(v) => set(t.cssVar, v, t.default)}
                        onReset={() => resetOne(t.cssVar)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </aside>

          <main className={styles.previewRail}>
            <ExportPanel overrides={overrides} onReset={reset} />
            <TypeSpecimen />
            <div className={styles.previewGrid}>
              <PanelPreview />
              <PluginPreview />
            </div>
            <HeroPreview />
          </main>
        </div>
      </div>
    </>
  );
}
