import { PROPERTY_GROUPS } from "@shared/constants";
import type { Edit } from "@shared/types";
import { useEditStore } from "../store/editStore";
import PropertyRow from "./PropertyRow";

interface Props {
  edit: Edit;
  index: number;
}

export default function EditCard({ edit, index }: Props) {
  const expanded = useEditStore((s) => s.selectedId) === edit.id;
  const select = useEditStore((s) => s.selectEdit);
  const remove = useEditStore((s) => s.removeEdit);

  const primarySelector = edit.element.selectors[0]?.value ?? edit.element.domPath;
  const changeCount = edit.changes.length;

  return (
    <article className="edit-card">
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
          </span>
          <span className="edit-changes-count" data-empty={changeCount === 0}>
            {changeCount === 0 ? "—" : `${changeCount} EDIT${changeCount === 1 ? "" : "S"}`}
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
        <div className="edit-body">
          {PROPERTY_GROUPS.map((group) => (
            <div key={group.label} className="property-group">
              <div className="property-group-label">{group.label}</div>
              {group.properties.map((prop) => (
                <PropertyRow key={prop} edit={edit} property={prop} />
              ))}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
