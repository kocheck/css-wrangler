import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/lab/tailwind/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
