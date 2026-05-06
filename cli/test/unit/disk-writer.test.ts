import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writePatchAtomic } from "../../src/core/disk-writer";
import type { Patch } from "../../../src/shared/types";

const samplePatch: Patch = {
  version: "1.0",
  source: "css-wrangler",
  url: "https://example.com",
  capturedAt: "2026-05-06T18:00:00.000Z",
  stylingSystem: "plain",
  breakpoints: { mobile: 375, tablet: 768, desktop: 1280 },
  edits: [],
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cssw-disk-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("writePatchAtomic", () => {
  it("writes the patch as JSON", async () => {
    const path = join(dir, "latest.json");
    await writePatchAtomic(path, samplePatch);
    const content = await readFile(path, "utf8");
    expect(JSON.parse(content)).toEqual(samplePatch);
  });

  it("creates parent directories if they don't exist", async () => {
    const path = join(dir, "nested", "deeper", "latest.json");
    await writePatchAtomic(path, samplePatch);
    const content = await readFile(path, "utf8");
    expect(JSON.parse(content)).toEqual(samplePatch);
  });

  it("produces a file ending with a newline", async () => {
    const path = join(dir, "latest.json");
    await writePatchAtomic(path, samplePatch);
    const content = await readFile(path, "utf8");
    expect(content.endsWith("\n")).toBe(true);
  });

  it("overwrites an existing file", async () => {
    const path = join(dir, "latest.json");
    await writePatchAtomic(path, { ...samplePatch, url: "first" });
    await writePatchAtomic(path, { ...samplePatch, url: "second" });
    const content = await readFile(path, "utf8");
    expect(JSON.parse(content).url).toBe("second");
  });

  it("leaves no temp files behind", async () => {
    const path = join(dir, "latest.json");
    await writePatchAtomic(path, samplePatch);
    const entries = await readdir(dir);
    expect(entries).toEqual(["latest.json"]);
  });

  it("survives concurrent writes (last finalize wins, no partial files)", async () => {
    const path = join(dir, "latest.json");
    await Promise.all([
      writePatchAtomic(path, { ...samplePatch, url: "a" }),
      writePatchAtomic(path, { ...samplePatch, url: "b" }),
      writePatchAtomic(path, { ...samplePatch, url: "c" }),
    ]);
    const entries = await readdir(dir);
    expect(entries).toEqual(["latest.json"]);
    const parsed = JSON.parse(await readFile(path, "utf8"));
    expect(["a", "b", "c"]).toContain(parsed.url);
  });

  it("preserves pretty-printed formatting (indent of 2)", async () => {
    const path = join(dir, "latest.json");
    await writePatchAtomic(path, samplePatch);
    const content = await readFile(path, "utf8");
    expect(content).toMatch(/\n  "version": "1.0"/);
  });

  it("writes a non-empty file", async () => {
    const path = join(dir, "latest.json");
    await writePatchAtomic(path, samplePatch);
    const s = await stat(path);
    expect(s.size).toBeGreaterThan(0);
  });
});
