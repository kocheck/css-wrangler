import type { CssState, TierProperty } from "@shared/constants";
import type { Edit } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import {
  ENUM_OPTIONS,
  buildLength,
  isColorProperty,
  isEnumProperty,
  isNumericProperty,
  parseLength,
  rgbToHex,
  unitsFor,
} from "../lib/parse-value";
import { tailwindHintFor } from "../lib/tailwind-hint";
import { useEditStore } from "../store/editStore";

interface Props {
  edit: Edit;
  property: TierProperty;
  state: CssState;
}

const SCALE_PROPERTIES: ReadonlySet<TierProperty> = new Set([
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "gap",
  "border-radius",
  "font-size",
]);

function divergesFromScale(property: TierProperty, value: string): boolean {
  if (!value || !value.trim()) return false;
  if (!SCALE_PROPERTIES.has(property)) return false;
  return tailwindHintFor(property, value) === null;
}

export default function PropertyRow({ edit, property, state }: Props) {
  const apply = useEditStore((s) => s.applyChange);
  const baselineKey = `${state}|desktop|${property}`;
  const baseline = edit.baseline[baselineKey] ?? "";
  const change = edit.changes.find(
    (c) => c.state === state && c.breakpoint === "desktop" && c.property === property,
  );
  const currentValue = change?.to ?? baseline;
  const edited = Boolean(change);
  const diverges = edited && divergesFromScale(property, currentValue);

  const commit = (v: string) =>
    apply({ editId: edit.id, state, breakpoint: "desktop", property, value: v });

  if (isColorProperty(property)) {
    return (
      <ColorRow
        property={property}
        value={currentValue}
        edited={edited}
        diverges={diverges}
        onCommit={commit}
      />
    );
  }

  if (isEnumProperty(property)) {
    return (
      <EnumRow
        property={property}
        value={currentValue}
        edited={edited}
        diverges={diverges}
        onCommit={commit}
      />
    );
  }

  if (isNumericProperty(property)) {
    return (
      <NumericRow
        property={property}
        value={currentValue}
        edited={edited}
        diverges={diverges}
        onCommit={commit}
      />
    );
  }

  return (
    <TextRow
      property={property}
      value={currentValue}
      edited={edited}
      diverges={diverges}
      onCommit={commit}
    />
  );
}

interface RowProps {
  property: TierProperty;
  value: string;
  edited: boolean;
  diverges: boolean;
  onCommit: (v: string) => void;
}

function PropertyName({
  edited,
  diverges,
  property,
}: {
  edited: boolean;
  diverges: boolean;
  property: TierProperty;
}) {
  return (
    <span className="property-name">
      <span className="edited-dot" aria-hidden="true" />
      {property}
      {diverges && (
        <span className="diverges-badge" title="Value not on the design scale">
          DIVERGES
        </span>
      )}
      {edited && !diverges && (
        <span className="edited-marker" aria-hidden="true">
          ●
        </span>
      )}
    </span>
  );
}

function NumericRow({ property, value, edited, diverges, onCommit }: RowProps) {
  const parsed = useMemo(() => parseLength(value), [value]);
  const units = unitsFor(property);
  const [num, setNum] = useState(parsed.numeric);
  const [unit, setUnit] = useState(parsed.unit || units[0] || "");

  useEffect(() => {
    setNum(parsed.numeric);
    setUnit(parsed.unit || units[0] || "");
  }, [parsed.numeric, parsed.unit, units]);

  const commit = (n: string, u: string) => {
    const next = buildLength(n, u);
    if (!next) return;
    onCommit(next);
  };

  return (
    <div className="property-row" data-edited={edited} data-diverges={diverges}>
      <PropertyName edited={edited} diverges={diverges} property={property} />
      <span className="value-cell">
        <input
          type="number"
          value={num}
          placeholder="—"
          onChange={(e) => setNum(e.target.value)}
          onBlur={() => commit(num, unit)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <select
          className="unit"
          value={unit}
          onChange={(e) => {
            setUnit(e.target.value);
            commit(num, e.target.value);
          }}
        >
          {units.map((u) => (
            <option key={u || "none"} value={u}>
              {u || "—"}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}

function ColorRow({ property, value, edited, diverges, onCommit }: RowProps) {
  const hex = useMemo(() => rgbToHex(value), [value]);
  const [color, setColor] = useState(hex);

  useEffect(() => setColor(hex), [hex]);

  return (
    <div className="property-row" data-edited={edited} data-diverges={diverges}>
      <PropertyName edited={edited} diverges={diverges} property={property} />
      <span className="value-cell">
        <span className="color-swatch" style={{ background: color || "transparent" }} />
        <input
          type="text"
          value={color}
          placeholder="#000000"
          onChange={(e) => setColor(e.target.value)}
          onBlur={() => color && onCommit(color)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          style={{ width: 80, textAlign: "left", padding: "var(--sp-2) var(--sp-3)" }}
        />
        <input
          type="color"
          value={color.startsWith("#") ? color.slice(0, 7) : "#000000"}
          onChange={(e) => {
            setColor(e.target.value);
            onCommit(e.target.value);
          }}
          style={{ width: 24, padding: 2, background: "transparent", cursor: "pointer" }}
          aria-label={`Pick ${property}`}
        />
      </span>
    </div>
  );
}

function EnumRow({ property, value, edited, diverges, onCommit }: RowProps) {
  const options = ENUM_OPTIONS[property] ?? [];
  return (
    <div className="property-row" data-edited={edited} data-diverges={diverges}>
      <PropertyName edited={edited} diverges={diverges} property={property} />
      <span className="value-cell">
        <select
          className="unit"
          value={value}
          onChange={(e) => onCommit(e.target.value)}
          style={{ minWidth: 96, padding: "var(--sp-2) var(--sp-3)", borderLeft: "none" }}
        >
          <option value="" disabled>
            —
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}

function TextRow({ property, value, edited, diverges, onCommit }: RowProps) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="property-row" data-edited={edited} data-diverges={diverges}>
      <PropertyName edited={edited} diverges={diverges} property={property} />
      <span className="value-cell">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text && onCommit(text)}
          style={{ width: 96, textAlign: "left", padding: "var(--sp-2) var(--sp-3)" }}
        />
      </span>
    </div>
  );
}
