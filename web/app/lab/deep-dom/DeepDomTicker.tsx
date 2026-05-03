"use client";

import { useEffect, useState } from "react";

export function DeepDomTicker() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date(Date.now()).toISOString().slice(11, 19);
  return (
    <span className="deep-fixed-header__ticker" suppressHydrationWarning>
      {`UTC ${now} · TICK ${String(tick).padStart(4, "0")}`}
    </span>
  );
}
