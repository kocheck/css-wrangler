"use client";

import { useEffect, useState } from "react";

export function DeepDomTicker() {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date().toISOString().slice(11, 19));
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setNow(new Date().toISOString().slice(11, 19));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="deep-fixed-header__ticker">
      {`UTC ${now ?? "--:--:--"} · TICK ${String(tick).padStart(4, "0")}`}
    </span>
  );
}
