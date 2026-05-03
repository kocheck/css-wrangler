import { useEffect, useState } from "react";
import { type BridgeStatus, getStatus, onStatus } from "../lib/bridge-client";
import { useEditStore } from "../store/editStore";

interface Props {
  editId: string;
}

/** CSS contract: every value here must have a matching `[data-state="…"]` rule in panel.css. */
type PushButtonState = "idle" | "ready" | "sent" | "blocked" | "offline";

export default function PushToFigmaButton({ editId }: Props) {
  const [status, setStatus] = useState<BridgeStatus>(getStatus());
  const [flash, setFlash] = useState<"sent" | "blocked" | null>(null);
  const pushSelectedToFigma = useEditStore((s) => s.pushSelectedToFigma);
  const selectedId = useEditStore((s) => s.selectedId);
  const edit = useEditStore((s) => s.edits.find((e) => e.id === editId));

  useEffect(() => onStatus(setStatus), []);

  const offline = status !== "connected";
  const changeCount = edit?.changes.length ?? 0;
  const empty = changeCount === 0;
  const inactive = selectedId !== editId;
  const disabled = offline || empty || inactive;

  function handleClick() {
    const ok = pushSelectedToFigma();
    setFlash(ok ? "sent" : "blocked");
    window.setTimeout(() => setFlash(null), 1200);
  }

  let label = `Push ${changeCount} ${changeCount === 1 ? "edit" : "edits"} to Figma`;
  let state: PushButtonState = "idle";
  if (flash === "sent") {
    label = "Sent to Figma";
    state = "sent";
  } else if (flash === "blocked") {
    label = "Bridge offline";
    state = "blocked";
  } else if (offline) {
    label = "Bridge offline — run pnpm bridge";
    state = "offline";
  } else if (empty) {
    label = "Edit a property to push";
    state = "idle";
  } else {
    state = "ready";
  }

  return (
    <button
      type="button"
      className="push-to-figma"
      onClick={handleClick}
      disabled={disabled}
      data-state={state}
    >
      <span className="push-label">{label}</span>
      <svg className="push-arrow" width="18" height="10" viewBox="0 0 18 10" aria-hidden="true">
        <path
          d="M0 5h14M11 1l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
    </button>
  );
}
