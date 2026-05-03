"use client";

import { useState } from "react";

type Item = { id: string; label: string };

const SET_A: Item[] = [
  { id: "alpha", label: "alpha · north" },
  { id: "bravo", label: "bravo · west" },
  { id: "charlie", label: "charlie · south" },
  { id: "delta", label: "delta · east" },
];

const SET_B: Item[] = [
  { id: "echo", label: "echo · sector 7" },
  { id: "foxtrot", label: "foxtrot · sector 3" },
  { id: "golf", label: "golf · sector 12" },
  { id: "hotel", label: "hotel · sector 1" },
  { id: "india", label: "india · sector 5" },
];

export function SubtreeToggle() {
  const [showAlt, setShowAlt] = useState(false);
  const items = showAlt ? SET_B : SET_A;

  return (
    <div className="deep-toggle">
      <h3 className="deep-toggle__heading">Mutating subtree</h3>
      <button type="button" className="deep-toggle__button" onClick={() => setShowAlt((s) => !s)}>
        {showAlt ? "Restore set A" : "Swap to set B"}
      </button>
      <ul className="deep-toggle__list">
        {items.map((item) => (
          <li key={item.id} id={item.id} className="deep-toggle__item">
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
