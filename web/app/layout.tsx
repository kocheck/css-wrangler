import type { Metadata } from "next";
import { fontMono, fontUI } from "./fonts";
import "./styles/tokens.css";
import "./styles/globals.css";

export const metadata: Metadata = {
  title: "CSS Wrangler — pick · tweak · ship",
  description:
    "A Chrome extension that turns visual CSS edits into a structured patch. Your AI agent applies it on the first try.",
  metadataBase: new URL("https://css-wrangler.vercel.app"),
  openGraph: {
    title: "CSS Wrangler",
    description: "Edit any site's CSS and hand the diff to Claude.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className={`${fontMono.variable} ${fontUI.variable}`}>
      <body>{children}</body>
    </html>
  );
}
