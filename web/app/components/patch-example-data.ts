import type { Patch } from "@shared/types";

export const examplePatch: Patch = {
  version: "1.0",
  source: "css-wrangler",
  url: "https://example.com",
  capturedAt: "2026-05-03T17:42:11.000Z",
  stylingSystem: "tailwind",
  breakpoints: { mobile: 375, tablet: 768, desktop: 1280 },
  edits: [
    {
      siblingGroup: null,
      element: {
        tag: "button",
        text: "Get started",
        role: "button",
        ariaLabel: null,
        selectors: [{ type: "class", value: ".hero-cta", stability: "high" }],
        domPath: "main > section.hero > button.hero-cta",
      },
      changes: [
        {
          state: "default",
          breakpoint: "desktop",
          property: "padding-top",
          from: "12px",
          to: "16px",
          tailwindHint: "pt-4",
          mediaQuery: null,
        },
        {
          state: "default",
          breakpoint: "tablet",
          property: "padding-top",
          from: "12px",
          to: "10px",
          tailwindHint: "pt-2.5",
          mediaQuery: "@media (max-width: 768px)",
        },
      ],
      media: [
        {
          breakpoint: "tablet",
          query: "@media (max-width: 768px)",
          changes: [
            {
              state: "default",
              breakpoint: "tablet",
              property: "padding-top",
              from: "12px",
              to: "10px",
              tailwindHint: "pt-2.5",
              mediaQuery: "@media (max-width: 768px)",
            },
          ],
        },
      ],
    },
  ],
};
