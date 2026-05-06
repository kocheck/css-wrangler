import { chmodSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = resolve(__dirname, "dist");
const outfile = resolve(outdir, "cli.js");
mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: [resolve(__dirname, "src/cli.ts")],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  packages: "external",
  logLevel: "info",
});

chmodSync(outfile, 0o755);
console.log(`[cli] built -> ${outfile}`);
