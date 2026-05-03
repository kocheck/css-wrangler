import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

// Figma plugin iframes can't load external <script src="…">. Bundle UI to a
// string so we can inline it into the HTML.
const uiOpts = {
  entryPoints: [resolve(__dirname, "src/ui.tsx")],
  bundle: true,
  format: "iife",
  target: "es2017",
  platform: "browser",
  jsx: "automatic",
  write: false,
  define: { "process.env.NODE_ENV": '"production"' },
};

function htmlWithInlineScript(jsSource) {
  return `<!doctype html>
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
    <script>${jsSource}</script>
  </body>
</html>`;
}

async function buildOnce() {
  const [, uiResult] = await Promise.all([build(codeOpts), build(uiOpts)]);
  const uiJs = uiResult.outputFiles?.[0]?.text ?? "";
  writeFileSync(resolve(outdir, "ui.html"), htmlWithInlineScript(uiJs));
  if (existsSync(resolve(__dirname, "manifest.json"))) {
    copyFileSync(resolve(__dirname, "manifest.json"), resolve(outdir, "manifest.json"));
  }
  console.log("[figma-plugin] built ->", outdir);
}

if (watch) {
  // Watch mode: rebuild and re-inline on every change.
  const codeCtx = await context(codeOpts);
  const uiCtx = await context({
    ...uiOpts,
    plugins: [
      {
        name: "inline-ui-into-html",
        setup(b) {
          b.onEnd((r) => {
            const js = r.outputFiles?.[0]?.text ?? "";
            writeFileSync(resolve(outdir, "ui.html"), htmlWithInlineScript(js));
          });
        },
      },
    ],
  });
  await Promise.all([codeCtx.watch(), uiCtx.watch()]);
  if (existsSync(resolve(__dirname, "manifest.json"))) {
    copyFileSync(resolve(__dirname, "manifest.json"), resolve(outdir, "manifest.json"));
  }
  console.log("[figma-plugin] watching…");
} else {
  await buildOnce();
}
