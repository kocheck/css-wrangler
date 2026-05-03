import { useEffect, useState } from "react";
import { type BridgeStatus, getStatus, onStatus } from "../lib/bridge-client";

export default function BridgeStatusPill() {
  const [status, setStatus] = useState<BridgeStatus>(getStatus());
  useEffect(() => onStatus(setStatus), []);

  let label = "BRIDGE OFFLINE";
  if (status === "connecting") label = "BRIDGE…";
  else if (status === "connected") label = "BRIDGE";

  return (
    <span className="bridge-pill" data-status={status} title={`Bridge ${status}`}>
      <span className="dot" />
      {label}
    </span>
  );
}
