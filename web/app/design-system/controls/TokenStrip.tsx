"use client";

import { type ChangeEvent, useId } from "react";
import type { TokenDef } from "../tokens";
import styles from "./Strip.module.css";

interface Props {
  token: TokenDef;
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
}

const LENGTH_UNIT_PATTERN = /^(-?\d*\.?\d+)([a-z%]*)$/i;

function splitLength(raw: string): { value: string; unit: string } {
  const match = raw.trim().match(LENGTH_UNIT_PATTERN);
  if (!match) return { value: raw, unit: "" };
  return { value: match[1] ?? "", unit: match[2] ?? "" };
}

export function TokenStrip({ token, value, onChange, onReset }: Props) {
  const id = useId();
  const edited = value !== token.default;

  const handleColor = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
  const handleText = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);

  return (
    <div className={styles.strip} data-edited={edited}>
      <span className={styles.led} aria-hidden="true" />
      <label className={styles.label} htmlFor={id}>
        <span className={styles.name}>{token.name}</span>
        {token.description ? (
          <span className={styles.note}>{token.description}</span>
        ) : (
          <span className={styles.note}>{token.yamlPath}</span>
        )}
      </label>
      <div style={{ display: "inline-flex", alignItems: "center" }}>
        {token.kind === "color" ? (
          <ColorControl id={id} value={value} onChange={handleColor} />
        ) : token.kind === "length" || token.kind === "duration" ? (
          <LengthControl id={id} value={value} onChange={onChange} />
        ) : (
          <TextControl id={id} value={value} onChange={handleText} />
        )}
        <button
          type="button"
          className={styles.reset}
          onClick={onReset}
          aria-label={`Reset ${token.name}`}
          title={`Reset to ${token.default}`}
        >
          ↻
        </button>
      </div>
    </div>
  );
}

function ColorControl({
  id,
  value,
  onChange,
}: { id: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div
      className={styles.control}
      style={{ ["--swatch" as string]: value } as React.CSSProperties}
    >
      <span className={styles.swatch} aria-hidden="true">
        <input type="color" value={value} onChange={onChange} aria-label="Pick color" />
      </span>
      <input
        id={id}
        type="text"
        className={styles.input}
        value={value.toUpperCase()}
        onChange={onChange}
        spellCheck={false}
      />
    </div>
  );
}

function LengthControl({
  id,
  value,
  onChange,
}: { id: string; value: string; onChange: (next: string) => void }) {
  const { value: num, unit } = splitLength(value);
  return (
    <div className={styles.control}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={styles.input}
        value={num}
        onChange={(e) => onChange(`${e.target.value}${unit}`)}
        spellCheck={false}
      />
      <span className={styles.unit}>{unit || "—"}</span>
    </div>
  );
}

function TextControl({
  id,
  value,
  onChange,
}: { id: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className={styles.control}>
      <input
        id={id}
        type="text"
        className={styles.input}
        style={{ width: "140px" }}
        value={value}
        onChange={onChange}
        spellCheck={false}
      />
    </div>
  );
}
