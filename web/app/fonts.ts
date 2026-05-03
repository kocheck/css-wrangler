import localFont from "next/font/local";

export const fontMono = localFont({
  src: "../public/fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "400 700",
});

export const fontUI = localFont({
  src: "../public/fonts/InterTight-Variable.woff2",
  variable: "--font-ui",
  display: "swap",
  weight: "400 700",
});
