"use client";

import { useCallback, useEffect, useState } from "react";
import { type TokenOverrides, isKnownTokenVar } from "./tokens";

const STORAGE_KEY = "css-wrangler:tuning-overrides:v1";
const LOG_PREFIX = "[css-wrangler] tuning overrides:";

function readStorage(): TokenOverrides {
  if (typeof window === "undefined") return {};
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn(`${LOG_PREFIX} localStorage read failed`, err);
    return {};
  }
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`${LOG_PREFIX} stored value is not JSON; resetting`, err);
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  // Drop any keys that no longer correspond to tokens we know — prevents stale
  // entries from a prior catalog version ghost-restoring deleted CSS vars.
  const next: TokenOverrides = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === "string" && isKnownTokenVar(k)) next[k] = v;
  }
  return next;
}

function writeStorage(overrides: TokenOverrides): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.warn(`${LOG_PREFIX} localStorage write failed (likely quota or disabled)`, err);
  }
}

export function useTokenOverrides() {
  const [overrides, setOverrides] = useState<TokenOverrides>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOverrides(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeStorage(overrides);
  }, [overrides, hydrated]);

  const set = useCallback((cssVar: string, value: string, defaultValue: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === defaultValue) {
        delete next[cssVar];
      } else {
        next[cssVar] = value;
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => setOverrides({}), []);

  const resetOne = useCallback((cssVar: string) => {
    setOverrides((prev) => {
      if (!(cssVar in prev)) return prev;
      const next = { ...prev };
      delete next[cssVar];
      return next;
    });
  }, []);

  return { overrides, set, reset, resetOne, hydrated };
}
