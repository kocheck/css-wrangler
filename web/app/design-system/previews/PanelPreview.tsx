import styles from "./Previews.module.css";

export function PanelPreview() {
  return (
    <div className={styles.frame}>
      <div className={styles.frameLabel}>
        <span>· Panel · Chrome side-panel</span>
        <span className={styles.frameDim}>380 px</span>
      </div>
      <div className={styles.frameBody}>
        <div className={styles.panel}>
          <header className={styles.panelHeader}>
            <div className={styles.panelHeaderRow}>
              <span className={styles.brand}>
                <span className={styles.brandMark} aria-hidden="true" />
                CSS Wrangler
              </span>
              <span className={styles.spacer} />
              <span className={styles.statusPill}>
                <span className={styles.statusDot} />
                READY
              </span>
              <span className={styles.bridgePill}>
                <span className={styles.statusDot} />
                BRIDGE
              </span>
              <button type="button" className={styles.clearAll}>
                Clear all
              </button>
            </div>
            <div className={styles.urlRow}>
              <span className={styles.urlLabel}>SRC</span>
              <span className={styles.urlValue}>tailwindcss.com/docs</span>
              <span className={styles.urlSystem}>TAILWIND</span>
            </div>
          </header>

          <div className={styles.pickSection}>
            <button type="button" className={styles.pickButton}>
              <span className={styles.crosshair} aria-hidden="true" />
              <span style={{ textAlign: "left" }}>Pick element</span>
              <span className={styles.pickHint}>⎋ ↵</span>
            </button>
          </div>

          <article className={styles.editCard}>
            <div className={styles.editCardHeader}>
              <span className={styles.editIndex}>01</span>
              <span className={styles.editTag}>
                <span className={styles.tagName}>button</span>
                <span className={styles.selector}>.btn-primary</span>
              </span>
              <span className={styles.syncedPill}>SYNCED</span>
              <span className={styles.changesCount}>3 EDITS</span>
            </div>
            <div className={styles.editBody}>
              <div className={styles.propertyGroup}>
                <div className={styles.propertyGroupLabel}>BACKGROUND</div>
                <div className={styles.propertyRow}>
                  <span className={styles.propertyName}>
                    <span className={styles.editedDot} />
                    background-color
                  </span>
                  <span className={styles.valueCell}>
                    <span className={styles.colorSwatch} />
                    <span className={styles.valueInput}>#FF3D00</span>
                  </span>
                </div>
              </div>
              <div className={styles.propertyGroup}>
                <div className={styles.propertyGroupLabel}>SPACING</div>
                <div className={styles.propertyRow}>
                  <span className={styles.propertyName}>
                    <span className={styles.editedDot} />
                    padding-inline
                  </span>
                  <span className={styles.valueCell}>
                    <span className={styles.valueInput}>24</span>
                    <span className={styles.valueUnit}>px</span>
                  </span>
                </div>
                <div className={styles.propertyRow} data-diverges="true">
                  <span className={styles.propertyName}>
                    <span className={styles.editedDot} />
                    padding-block
                    <span className={styles.divergesBadge}>DIVERGES</span>
                  </span>
                  <span className={styles.valueCell}>
                    <span className={styles.valueInput}>14</span>
                    <span className={styles.valueUnit}>px</span>
                  </span>
                </div>
              </div>
            </div>
          </article>

          <footer className={styles.panelFooter}>
            <div className={styles.footerMeta}>
              <span className={styles.footerCount}>1 EL</span>
              <span className={styles.footerDivider} />
              <span className={styles.footerCount}>3 CH</span>
              <span className={styles.footerDivider} />
              <span className={styles.footerCount}>1 GR</span>
            </div>
            <button type="button" className={styles.copyPatch}>
              Copy
              <span className={styles.copyBadge}>JSON</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
