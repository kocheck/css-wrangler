import { useEditStore } from "../store/editStore";
import EditCard from "./EditCard";

export default function EditList() {
  const edits = useEditStore((s) => s.edits);

  if (edits.length === 0) {
    return (
      <div className="edit-list">
        <div className="edit-list-empty">
          <div className="schematic" aria-hidden="true" />
          <span>NO ELEMENTS</span>
          <span style={{ color: "var(--fg-quaternary)" }}>PICK A NODE TO BEGIN</span>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-list">
      {edits.map((edit, i) => (
        <EditCard key={edit.id} edit={edit} index={i + 1} />
      ))}
    </div>
  );
}
