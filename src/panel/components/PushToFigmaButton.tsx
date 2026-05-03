import { useEffect, useState } from "react";
import { type BridgeStatus, getStatus, onStatus } from "../lib/bridge-client";
import { useEditStore } from "../store/editStore";

interface Props {
  editId: string;
}

export default function PushToFigmaButton({ editId }: Props) {
  const [status, setStatus] = useState<BridgeStatus>(getStatus());
  const [flash, setFlash] = useState<"sent" | "blocked" | null>(null);
  const pushSelectedToFigma = useEditStore((s) => s.pushSelectedToFigma);
  const selectedId = useEditStore((s) => s.selectedId);
  const edit = useEditStore((s) => s.edits.find((e) => e.id === editId));

  useEffect(() => onStatus(setStatus), []);

  const offline = status !== "connected";
  const empty = !edit || edit.changes.length === 0;
  const inactive = selectedId !== editId;
  const disabled = offline || empty || inactive;

  function handleClick() {
    const ok = pushSelectedToFigma();
    setFlash(ok ? "sent" : "blocked");
    window.setTimeout(() => setFlash(null), 1200);
  }

  let label = "Push to Figma";
  if (flash === "sent") label = "Pushed →";
  else if (flash === "blocked") label = "No bridge";
  else if (offline) label = "Bridge offline";

  return (
    <button
      type="button"
      className="push-to-figma"
      onClick={handleClick}
      disabled={disabled}
      data-flash={flash ?? undefined}
    >
      {label}
    </button>
  );
}
