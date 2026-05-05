import type { Metadata } from "next";
import { Playground } from "./Playground";

export const metadata: Metadata = {
  title: "Tuning Console · CSS Wrangler",
  description:
    "Live token playground. Edit a token, ripple it through the panel, the plugin, and the landing hero.",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <Playground />;
}
