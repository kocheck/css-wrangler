"use client";

import type { TokenOverrides } from "./tokens";

interface Props {
  overrides: TokenOverrides;
}

export function StyleInjector({ overrides }: Props) {
  const decls = Object.entries(overrides)
    .map(([cssVar, value]) => `  ${cssVar}: ${value};`)
    .join("\n");

  if (decls.length === 0) return null;

  const css = `[data-tuning] {\n${decls}\n}\n`;

  return (
    <style data-tuning-injector="" suppressHydrationWarning>
      {css}
    </style>
  );
}
