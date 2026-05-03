import type { CssState } from "@shared/constants";
import { PROPERTY_GROUPS } from "@shared/constants";
import type { Edit, PropertyChange } from "@shared/types";
import { useMemo } from "react";
import { tailwindHintFor } from "../lib/tailwind-hint";
import { useEditStore } from "../store/editStore";
import PropertyRow from "./PropertyRow";
import PushToFigmaButton from "./PushToFigmaButton";

interface Props {
  edit: Edit;
  index: number;
  groupLabel: string | null;
  isSynced: boolean;
}

const STATE_TABS: ReadonlyArray<CssState> = ["default", "hover", "focus"];

export default function EditCard({ edit, index, groupLabel, isSynced }: Props) {
  const expanded = useEditStore((s) => s.selectedId) === edit.id;
  const select = useEditStore((s) => s.selectEdit);
  const remove = useEditStore((s) => s.removeEdit);
  const stylingSystem = useEditStore((s) => s.stylingSystem);
  const selectedState = useEditStore((s) => s.selectedStateByEdit[edit.id]) ?? "default";
  const forceState = useEditStore((s) => s.forceStateByEdit[edit.id]) ?? null;
  const setSelectedState = useEditStore((s) => s.setSelectedState);
  const toggleForceState = useEditStore((s) => s.toggleForceState);

  const primarySelector = edit.element.selectors[0]?.value ?? edit.element.domPath;
  const changeCount = edit.changes.length;

  const stateCounts = useMemo(() => {
    const counts: Record<CssState, number> = { default: 0, hover: 0, focus: 0 };
    for (const c of edit.changes) counts[c.state] += 1;
    return counts;
  }, [edit.changes]);

  const tailwindChips = useMemo(() => {
    if (stylingSystem !== "tailwind") return [] as Array<{ key: string; hint: string }>;
    return edit.changes
      .filter((c) => c.state === selectedState)
      .map((c) => {
        const hint = tailwindHintFor(c.property, c.to);
        return hint ? { key: `${c.property}-${c.to}`, hint } : null;
      })
      .filter((x): x is { key: string; hint: string } => x !== null);
  }, [edit.changes, stylingSystem, selectedState]);

  return (
    <article className="edit-card" data-group={groupLabel ?? undefined}>
      <div className="edit-card-header">
        <button
          type="button"
          className="edit-card-toggle"
          onClick={() => select(expanded ? null : edit.id)}
          aria-expanded={expanded}
        >
          <span className="edit-index">{String(index).padStart(2, "0")}</span>
          <span className="edit-tag">
            <span className="tag-name">{edit.element.tag}</span>
            <span className="selector">{primarySelector}</span>
            {groupLabel && <span className="group-tag">GROUP {groupLabel}</span>}
          </span>
          <span className="edit-status">
            {isSynced && <span className="synced-pill">SYNCED</span>}
            <span className="edit-changes-count" data-empty={changeCount === 0}>
              {changeCount === 0 ? "—" : `${changeCount} EDIT${changeCount === 1 ? "" : "S"}`}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Remove element"
          onClick={() => void remove(edit.id)}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
        </button>
      </div>
      {expanded && (
        <>
          <div className="state-tabs">
            {STATE_TABS.map((s) => (
              <button
                key={s}
                type="button"
                className="state-tab"
                data-active={selectedState === s}
                onClick={() => setSelectedState(edit.id, s)}
              >
                <span className="tab-count" data-active={selectedState === s}>
                  {stateCounts[s]}
                </span>
                {s}
              </button>
            ))}
            <span className="state-tabs-spacer" />
            {selectedState !== "default" && (
              <button
                type="button"
                className="force-toggle"
                data-on={forceState === selectedState}
                onClick={() => void toggleForceState(edit.id)}
                aria-pressed={forceState === selectedState}
              >
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span>FORCE</span>
              </button>
            )}
            <PushToFigmaButton editId={edit.id} />
          </div>
          {selectedState !== "default" && (
            <div className="state-hint">
              <span className="state-hint-label">Editing :{selectedState}</span>
              <span className="state-hint-body">
                Original :{selectedState} preserved · sibling-class trick
              </span>
            </div>
          )}
          <div className="edit-body">
            {PROPERTY_GROUPS.map((group) => (
              <div key={group.label} className="property-group">
                <div className="property-group-label">{group.label}</div>
                {group.properties.map((prop) => (
                  <PropertyRow
                    key={`${selectedState}-${prop}`}
                    edit={edit}
                    property={prop}
                    state={selectedState}
                  />
                ))}
              </div>
            ))}
            {tailwindChips.length > 0 && <TailwindHintFooter chips={tailwindChips} />}
            {selectedState !== "default" && (
              <DiffSummary changes={edit.changes.filter((c) => c.state === selectedState)} />
            )}
          </div>
        </>
      )}
    </article>
  );
}

function TailwindHintFooter({ chips }: { chips: Array<{ key: string; hint: string }> }) {
  return (
    <div className="tailwind-hint">
      <div className="tailwind-hint-label">
        <span className="tailwind-label">Tailwind</span>
        <span className="suggested-utilities">SUGGESTED UTILITIES</span>
      </div>
      <div className="tailwind-hint-chips">
        {chips.map((c) => (
          <span key={c.key} className="hint-chip">
            {c.hint}
          </span>
        ))}
      </div>
    </div>
  );
}

function DiffSummary({ changes }: { changes: PropertyChange[] }) {
  if (changes.length === 0) return null;
  return (
    <div className="diff-summary">
      <div className="diff-label">DIFF VS DEFAULT</div>
      <pre>{changes.map((c) => `+ ${c.property}: ${c.to};`).join("\n")}</pre>
    </div>
  );
}
