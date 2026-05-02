import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "node:path";
import manifest from "./src/manifest";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@panel": path.resolve(__dirname, "src/panel"),
      "@content": path.resolve(__dirname, "src/content"),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: { port: 5175 },
  },
  build: {
    target: "esnext",
    sourcemap: true,
  },
});
