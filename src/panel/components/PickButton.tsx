import { useEditStore } from "../store/editStore";

export default function PickButton() {
  const pickActive = useEditStore((s) => s.pickActive);
  const startPick = useEditStore((s) => s.startPick);
  const cancelPick = useEditStore((s) => s.cancelPick);
  const contentReady = useEditStore((s) => s.contentReady);

  return (
    <button
      type="button"
      className="pick-button"
      data-active={pickActive}
      disabled={!contentReady}
      onClick={() => (pickActive ? void cancelPick() : void startPick())}
    >
      <span className="crosshair" aria-hidden="true" />
      <span>{pickActive ? "Cancel pick" : "Pick element"}</span>
      <span className="hint">{pickActive ? "ESC" : "↵"}</span>
    </button>
  );
}
