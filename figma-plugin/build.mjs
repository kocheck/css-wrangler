import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// figma-plugin/build.mjs
import { build, context } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");
const outdir = resolve(__dirname, "dist");
mkdirSync(outdir, { recursive: true });

const codeOpts = {
  entryPoints: [resolve(__dirname, "src/code.ts")],
  outfile: resolve(outdir, "code.js"),
  bundle: true,
  format: "iife",
  target: "es2017",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"production"' },
};

const uiOpts = {
  entryPoints: [resolve(__dirname, "src/ui.tsx")],
  outfile: resolve(outdir, "ui.js"),
  bundle: true,
  format: "iife",
  target: "es2017",
  platform: "browser",
  jsx: "automatic",
  loader: { ".css": "text" },
  define: { "process.env.NODE_ENV": '"production"' },
};

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #111; color: #eee; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="ui.js"></script>
  </body>
</html>`;

async function buildOnce() {
  await Promise.all([build(codeOpts), build(uiOpts)]);
  writeFileSync(resolve(outdir, "ui.html"), HTML);
  if (existsSync(resolve(__dirname, "manifest.json"))) {
    copyFileSync(resolve(__dirname, "manifest.json"), resolve(outdir, "manifest.json"));
  }
  console.log("[figma-plugin] built ->", outdir);
}

if (watch) {
  const ctxs = await Promise.all([context(codeOpts), context(uiOpts)]);
  await Promise.all(ctxs.map((c) => c.watch()));
  writeFileSync(resolve(outdir, "ui.html"), HTML);
  console.log("[figma-plugin] watching…");
} else {
  await buildOnce();
}
