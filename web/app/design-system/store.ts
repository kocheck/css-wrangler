"use client";

import { useCallback, useEffect, useState } from "react";
import type { TokenOverrides } from "./tokens";

const STORAGE_KEY = "css-wrangler:tuning-overrides:v1";

function readStorage(): TokenOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as TokenOverrides;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStorage(overrides: TokenOverrides): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage full or disabled; silent — playground still works in-session.
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
