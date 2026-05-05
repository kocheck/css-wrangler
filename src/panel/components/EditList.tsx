import type { Edit, PropertyChange } from "@shared/types";
import { useMemo } from "react";
import { useEditStore } from "../store/editStore";
import EditCard from "./EditCard";
import SiblingBanner from "./SiblingBanner";

function changeKey(c: PropertyChange): string {
  return `${c.state}|${c.breakpoint}|${c.property}|${c.to}`;
}

function changesEqual(a: Edit, b: Edit): boolean {
  if (a.changes.length !== b.changes.length) return false;
  const aKeys = new Set(a.changes.map(changeKey));
  return b.changes.every((c) => aKeys.has(changeKey(c)));
}

// Excel-style: A..Z, AA..AZ, BA..BZ, ...
function indexToLabel(index: number): string {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

function deriveGroupLabels(edits: Edit[]): Map<string, string> {
  const labels = new Map<string, string>();
  let i = 0;
  for (const e of edits) {
    if (!e.siblingGroup) continue;
    if (labels.has(e.siblingGroup)) continue;
    labels.set(e.siblingGroup, indexToLabel(i++));
  }
  return labels;
}

function deriveSyncedFlags(edits: Edit[]): Map<string, boolean> {
  const flags = new Map<string, boolean>();
  const byGroup = new Map<string, Edit[]>();
  for (const e of edits) {
    if (!e.siblingGroup) continue;
    const list = byGroup.get(e.siblingGroup) ?? [];
    list.push(e);
    byGroup.set(e.siblingGroup, list);
  }
  for (const [, list] of byGroup) {
    if (list.length < 2) continue;
    const first = list[0];
    if (!first || first.changes.length === 0) continue;
    const allMatch = list.every((e) => changesEqual(first, e));
    if (allMatch) for (const e of list) flags.set(e.id, true);
  }
  return flags;
}

export default function EditList() {
  const edits = useEditStore((s) => s.edits);

  const groupLabels = useMemo(() => deriveGroupLabels(edits), [edits]);
  const syncedFlags = useMemo(() => deriveSyncedFlags(edits), [edits]);

  if (edits.length === 0) {
    return (
      <div className="edit-list">
        <div className="edit-list-empty">
          <div className="schematic" aria-hidden="true" />
          <span>NO ELEMENTS</span>
          <span style={{ color: "var(--fg-tertiary)" }}>PICK A NODE TO BEGIN</span>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-list">
      <SiblingBanner />
      {edits.map((edit, i) => (
        <EditCard
          key={edit.id}
          edit={edit}
          index={i + 1}
          groupLabel={edit.siblingGroup ? (groupLabels.get(edit.siblingGroup) ?? null) : null}
          isSynced={syncedFlags.get(edit.id) ?? false}
        />
      ))}
    </div>
  );
}
