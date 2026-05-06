import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PATCH_PUSHED_TYPE } from "../../../src/shared/mcp-messages";
import type { Patch } from "../../../src/shared/types";
import { nextFreePort, spawnDaemon, type SpawnedDaemon } from "../helpers/daemon";
import { makePatch, pushPatch, pushRaw } from "../helpers/fixtures";
import { McpStdioClient } from "../helpers/mcp-client";

let daemon: SpawnedDaemon;
let client: McpStdioClient;
let port: number;

beforeEach(async () => {
  port = nextFreePort();
  daemon = spawnDaemon("mcp", [], { env: { WRANGLER_MCP_PORT: String(port) } });
  await daemon.awaitStderrMatch(/listening for panel pushes/, 5000);
  await daemon.awaitStderrMatch(/ready \(stdio transport\)/, 5000);
  client = new McpStdioClient(daemon.child);
  await client.initialize();
});

afterEach(async () => {
  await daemon.stop();
});

describe("MCP stdio surface", () => {
  it("exposes 5 tools, 2 resources, 1 prompt", async () => {
    const tools = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "clear_patches",
      "get_latest_patch",
      "get_patch_status",
      "get_patches",
      "mark_patch_applied",
    ]);
    const resources = await client.listResources();
    expect(resources.map((r) => r.uri).sort()).toEqual([
      "css-wrangler://history",
      "css-wrangler://latest",
    ]);
    const prompts = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(["apply-css-changes"]);
  });

  it("get_latest_patch returns null when empty", async () => {
    const result = await client.callTool("get_latest_patch");
    expect(result).toBeNull();
  });

  it("get_latest_patch returns the most recent and is idempotent", async () => {
    await pushPatch(port, makePatch({ url: "first", capturedAt: "2026-05-06T18:00:00.000Z" }));
    await pushPatch(port, makePatch({ url: "second", capturedAt: "2026-05-06T18:01:00.000Z" }));

    const a = await client.callTool<Patch>("get_latest_patch");
    const b = await client.callTool<Patch>("get_latest_patch");
    expect(a.url).toBe("second");
    expect(b.url).toBe("second");
    expect(a.capturedAt).toBe(b.capturedAt);
  });

  it("get_patches returns newest-first", async () => {
    await pushPatch(port, makePatch({ url: "a", capturedAt: "2026-05-06T18:00:00.000Z" }));
    await pushPatch(port, makePatch({ url: "b", capturedAt: "2026-05-06T18:01:00.000Z" }));
    await pushPatch(port, makePatch({ url: "c", capturedAt: "2026-05-06T18:02:00.000Z" }));

    const list = await client.callTool<Patch[]>("get_patches", { limit: 5 });
    expect(list.map((p) => p.url)).toEqual(["c", "b", "a"]);
  });

  it("mark_patch_applied with no arg marks the latest", async () => {
    await pushPatch(port, makePatch({ capturedAt: "2026-05-06T18:00:00.000Z" }));
    const newer = "2026-05-06T18:01:00.000Z";
    await pushPatch(port, makePatch({ capturedAt: newer }));

    const marked = await client.callTool<{ marked: string }>("mark_patch_applied");
    expect(marked.marked).toBe(newer);

    const status = await client.callTool<{ appliedCursor: string }>("get_patch_status");
    expect(status.appliedCursor).toBe(newer);
  });

  it("clear_patches empties the queue and returns the count", async () => {
    await pushPatch(port, makePatch({ url: "a", capturedAt: "2026-05-06T18:00:00.000Z" }));
    await pushPatch(port, makePatch({ url: "b", capturedAt: "2026-05-06T18:01:00.000Z" }));

    const cleared = await client.callTool<{ cleared: number }>("clear_patches");
    expect(cleared.cleared).toBe(2);

    const status = await client.callTool<{ count: number }>("get_patch_status");
    expect(status.count).toBe(0);
  });

  it("rejects malformed messages without crashing the daemon", async () => {
    await pushRaw(port, { type: PATCH_PUSHED_TYPE, version: "0.9", patch: makePatch() });
    await pushPatch(port, makePatch({ url: "after-malformed" }));
    const latest = await client.callTool<Patch>("get_latest_patch");
    expect(latest.url).toBe("after-malformed");
  });

  it("apply-css-changes prompt embeds the rules verbatim", async () => {
    const text = await client.getPrompt("apply-css-changes");
    expect(text).toContain("Honor `siblingGroup`");
    expect(text).toContain("get_latest_patch");
    expect(text).toContain("mark_patch_applied");
  });

  it("css-wrangler://latest resource mirrors get_latest_patch", async () => {
    await pushPatch(port, makePatch({ url: "resource-test" }));
    const fromResource = (await client.readResource("css-wrangler://latest")) as Patch;
    const fromTool = await client.callTool<Patch>("get_latest_patch");
    expect(fromResource.url).toBe("resource-test");
    expect(fromResource.capturedAt).toBe(fromTool.capturedAt);
  });

  it("css-wrangler://history reflects the applied cursor", async () => {
    await pushPatch(port, makePatch({ url: "old", capturedAt: "2026-05-06T18:00:00.000Z" }));
    await pushPatch(port, makePatch({ url: "new", capturedAt: "2026-05-06T18:01:00.000Z" }));
    await client.callTool("mark_patch_applied");
    const history = (await client.readResource("css-wrangler://history")) as Patch[];
    expect(history).toEqual([]);
  });
});
