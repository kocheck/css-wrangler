import { useEditStore } from "../store/editStore";

export default function SiblingBanner() {
  const pending = useEditStore((s) => s.pendingSibling);
  const applyToSimilar = useEditStore((s) => s.applyToSimilar);
  const dismiss = useEditStore((s) => s.dismissSiblingPrompt);

  if (!pending) return null;

  return (
    <section className="sibling-banner" aria-label="Similar elements detected">
      <div className="sibling-banner-mark" aria-hidden="true">
        <span className="dot a" />
        <span className="dot b" />
      </div>
      <div className="sibling-banner-body">
        <div className="sibling-banner-label">
          SIMILAR ELEMENTS DETECTED · {pending.count} FOUND
        </div>
        <div className="sibling-banner-copy">
          Apply edits to all <code>{pending.selector}</code> elements? Patch will group them into a
          single source change.
        </div>
        <div className="sibling-banner-actions">
          <button
            type="button"
            className="sibling-apply"
            onClick={() => void applyToSimilar(pending.editId)}
          >
            Apply to all
          </button>
          <button type="button" className="sibling-dismiss" onClick={() => dismiss()}>
            Just this one
          </button>
        </div>
      </div>
    </section>
  );
}
