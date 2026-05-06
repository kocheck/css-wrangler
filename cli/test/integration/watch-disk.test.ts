import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import type { Patch } from "../../../src/shared/types";
import { nextFreePort, spawnDaemon, type SpawnedDaemon } from "../helpers/daemon";

function makePatch(overrides: Partial<Patch> = {}): Patch {
  return {
    version: "1.0",
    source: "css-wrangler",
    url: "https://example.com",
    capturedAt: new Date().toISOString(),
    stylingSystem: "plain",
    breakpoints: { mobile: 375, tablet: 768, desktop: 1280 },
    edits: [],
    ...overrides,
  };
}

async function pushPatch(port: number, patch: Patch): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    const t = setTimeout(() => reject(new Error("ws timeout")), 2000);
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "patch-pushed", version: "1.0", patch }));
      setTimeout(() => {
        ws.close();
        clearTimeout(t);
        resolve();
      }, 100);
    });
    ws.on("error", (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

let dir: string;
let path: string;
let port: number;
let daemon: SpawnedDaemon;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "cssw-watch-test-"));
  path = join(dir, "latest.json");
  port = nextFreePort();
  daemon = spawnDaemon("watch", ["--port", String(port), "--path", path]);
  await daemon.awaitStderrMatch(/listening for panel pushes/, 5000);
});

afterEach(async () => {
  await daemon.stop();
  await rm(dir, { recursive: true, force: true });
});

describe("css-wrangler watch", () => {
  it("writes the latest patch to disk", async () => {
    const patch = makePatch({ url: "first" });
    await pushPatch(port, patch);
    await daemon.awaitStderrMatch(/url=first/, 3000);
    const written = JSON.parse(await readFile(path, "utf8"));
    expect(written.url).toBe("first");
  });

  it("overwrites with the latest on subsequent pushes", async () => {
    await pushPatch(port, makePatch({ url: "first" }));
    await daemon.awaitStderrMatch(/url=first/, 3000);
    await pushPatch(port, makePatch({ url: "second" }));
    await daemon.awaitStderrMatch(/url=second/, 3000);
    const written = JSON.parse(await readFile(path, "utf8"));
    expect(written.url).toBe("second");
  });

  it("ignores malformed messages and keeps the prior file", async () => {
    await pushPatch(port, makePatch({ url: "good" }));
    await daemon.awaitStderrMatch(/url=good/, 3000);
    // Wrong version
    await new Promise<void>((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "patch-pushed", version: "0.9", patch: makePatch() }));
        setTimeout(() => {
          ws.close();
          resolve();
        }, 80);
      });
    });
    await daemon.awaitStderrMatch(/protocol version mismatch/, 2000);
    // File still contains the good push.
    const written = JSON.parse(await readFile(path, "utf8"));
    expect(written.url).toBe("good");
  });

  it("rejects unknown --port flag value with exit code 1", async () => {
    const bad = spawnDaemon("watch", ["--port", "99999"]);
    await new Promise<void>((r) => bad.child.once("exit", () => r()));
    expect(bad.child.exitCode).toBe(1);
    expect(bad.stderr.some((l) => /invalid port/.test(l))).toBe(true);
  });
});
