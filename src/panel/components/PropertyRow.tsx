import type { TierProperty } from "@shared/constants";
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
import { useEditStore } from "../store/editStore";

interface Props {
  edit: Edit;
  property: TierProperty;
}

export default function PropertyRow({ edit, property }: Props) {
  const apply = useEditStore((s) => s.applyChange);
  const baselineKey = `default|desktop|${property}`;
  const baseline = edit.baseline[baselineKey] ?? "";
  const change = edit.changes.find(
    (c) => c.state === "default" && c.breakpoint === "desktop" && c.property === property,
  );
  const currentValue = change?.to ?? baseline;
  const edited = Boolean(change);

  if (isColorProperty(property)) {
    return (
      <ColorRow
        property={property}
        value={currentValue}
        edited={edited}
        onCommit={(v) =>
          apply({
            editId: edit.id,
            state: "default",
            breakpoint: "desktop",
            property,
            value: v,
          })
        }
      />
    );
  }

  if (isEnumProperty(property)) {
    return (
      <EnumRow
        property={property}
        value={currentValue}
        edited={edited}
        onCommit={(v) =>
          apply({
            editId: edit.id,
            state: "default",
            breakpoint: "desktop",
            property,
            value: v,
          })
        }
      />
    );
  }

  if (isNumericProperty(property)) {
    return (
      <NumericRow
        property={property}
        value={currentValue}
        edited={edited}
        onCommit={(v) =>
          apply({
            editId: edit.id,
            state: "default",
            breakpoint: "desktop",
            property,
            value: v,
          })
        }
      />
    );
  }

  // generic text fallback
  return (
    <TextRow
      property={property}
      value={currentValue}
      edited={edited}
      onCommit={(v) =>
        apply({
          editId: edit.id,
          state: "default",
          breakpoint: "desktop",
          property,
          value: v,
        })
      }
    />
  );
}

function NumericRow({
  property,
  value,
  edited,
  onCommit,
}: {
  property: TierProperty;
  value: string;
  edited: boolean;
  onCommit: (v: string) => void;
}) {
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
    <div className="property-row" data-edited={edited}>
      <span className="property-name">{property}</span>
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

function ColorRow({
  property,
  value,
  edited,
  onCommit,
}: {
  property: TierProperty;
  value: string;
  edited: boolean;
  onCommit: (v: string) => void;
}) {
  const hex = useMemo(() => rgbToHex(value), [value]);
  const [color, setColor] = useState(hex);

  useEffect(() => setColor(hex), [hex]);

  return (
    <div className="property-row" data-edited={edited}>
      <span className="property-name">{property}</span>
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

function EnumRow({
  property,
  value,
  edited,
  onCommit,
}: {
  property: TierProperty;
  value: string;
  edited: boolean;
  onCommit: (v: string) => void;
}) {
  const options = ENUM_OPTIONS[property] ?? [];
  return (
    <div className="property-row" data-edited={edited}>
      <span className="property-name">{property}</span>
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

function TextRow({
  property,
  value,
  edited,
  onCommit,
}: {
  property: TierProperty;
  value: string;
  edited: boolean;
  onCommit: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="property-row" data-edited={edited}>
      <span className="property-name">{property}</span>
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
