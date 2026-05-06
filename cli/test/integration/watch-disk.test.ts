import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PATCH_PUSHED_TYPE } from "../../../src/shared/mcp-messages";
import { nextFreePort, spawnDaemon, type SpawnedDaemon } from "../helpers/daemon";
import { makePatch, pushPatch, pushRaw } from "../helpers/fixtures";

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
    await pushPatch(port, makePatch({ url: "first" }));
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
    await pushRaw(port, { type: PATCH_PUSHED_TYPE, version: "0.9", patch: makePatch() });
    await daemon.awaitStderrMatch(/protocol version mismatch/, 2000);
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
