import { describe, expect, it, vi } from "vitest";
import { PatchBus, RING_CAPACITY } from "../../src/core/patch-bus";
import type { Patch } from "../../../src/shared/types";

function makePatch(overrides: Partial<Patch> = {}): Patch {
  return {
    version: "1.0",
    source: "css-wrangler",
    url: "https://example.com",
    capturedAt: "2026-05-06T18:00:00.000Z",
    stylingSystem: "plain",
    breakpoints: { mobile: 375, tablet: 768, desktop: 1280 },
    edits: [],
    ...overrides,
  };
}

describe("PatchBus", () => {
  describe("push + latest", () => {
    it("returns null when empty", () => {
      const bus = new PatchBus();
      expect(bus.latest()).toBeNull();
    });

    it("returns the most recent patch", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ url: "a" }));
      bus.push(makePatch({ url: "b" }));
      expect(bus.latest()?.url).toBe("b");
    });

    it("is idempotent — repeated calls don't advance any cursor", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ url: "a" }));
      bus.push(makePatch({ url: "b" }));
      expect(bus.latest()?.url).toBe("b");
      expect(bus.latest()?.url).toBe("b");
      expect(bus.latest()?.url).toBe("b");
    });
  });

  describe("ring buffer eviction", () => {
    it("caps at RING_CAPACITY", () => {
      const bus = new PatchBus();
      for (let i = 0; i < RING_CAPACITY + 10; i++) {
        bus.push(makePatch({ url: `https://e/${i}` }));
      }
      expect(bus.list(RING_CAPACITY).length).toBe(RING_CAPACITY);
    });

    it("evicts oldest first (FIFO)", () => {
      const bus = new PatchBus();
      for (let i = 0; i < RING_CAPACITY + 5; i++) {
        bus.push(makePatch({ url: `${i}`, capturedAt: `2026-05-06T18:00:${String(i).padStart(2, "0")}.000Z` }));
      }
      const list = bus.list(RING_CAPACITY);
      expect(list[0]?.url).toBe(String(RING_CAPACITY + 4));
      expect(list[list.length - 1]?.url).toBe("5");
    });
  });

  describe("list", () => {
    it("returns newest-first", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ url: "a" }));
      bus.push(makePatch({ url: "b" }));
      bus.push(makePatch({ url: "c" }));
      expect(bus.list().map((p) => p.url)).toEqual(["c", "b", "a"]);
    });

    it("respects the limit", () => {
      const bus = new PatchBus();
      for (let i = 0; i < 30; i++) bus.push(makePatch({ url: `${i}` }));
      expect(bus.list(5).length).toBe(5);
      expect(bus.list(5)[0]?.url).toBe("29");
    });

    it("returns [] for limit <= 0", () => {
      const bus = new PatchBus();
      bus.push(makePatch());
      expect(bus.list(0)).toEqual([]);
      expect(bus.list(-1)).toEqual([]);
    });

    it("defaults to 20", () => {
      const bus = new PatchBus();
      for (let i = 0; i < 30; i++) bus.push(makePatch({ url: `${i}` }));
      expect(bus.list().length).toBe(20);
    });
  });

  describe("markApplied", () => {
    it("returns null when empty", () => {
      const bus = new PatchBus();
      expect(bus.markApplied()).toBeNull();
    });

    it("no-arg marks the most recent", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ capturedAt: "2026-01-01T00:00:00.000Z" }));
      bus.push(makePatch({ capturedAt: "2026-02-01T00:00:00.000Z" }));
      expect(bus.markApplied()).toBe("2026-02-01T00:00:00.000Z");
      expect(bus.status().appliedCursor).toBe("2026-02-01T00:00:00.000Z");
    });

    it("with capturedAt marks that specific patch", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ capturedAt: "2026-01-01T00:00:00.000Z" }));
      bus.push(makePatch({ capturedAt: "2026-02-01T00:00:00.000Z" }));
      expect(bus.markApplied("2026-01-01T00:00:00.000Z")).toBe("2026-01-01T00:00:00.000Z");
      expect(bus.status().appliedCursor).toBe("2026-01-01T00:00:00.000Z");
    });

    it("returns null when capturedAt doesn't match any patch", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ capturedAt: "2026-01-01T00:00:00.000Z" }));
      expect(bus.markApplied("2099-01-01T00:00:00.000Z")).toBeNull();
      expect(bus.status().appliedCursor).toBeNull();
    });
  });

  describe("clear", () => {
    it("returns the count cleared", () => {
      const bus = new PatchBus();
      bus.push(makePatch());
      bus.push(makePatch());
      bus.push(makePatch());
      expect(bus.clear()).toBe(3);
    });

    it("resets the applied cursor", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ capturedAt: "2026-01-01T00:00:00.000Z" }));
      bus.markApplied();
      bus.clear();
      expect(bus.status().appliedCursor).toBeNull();
    });

    it("leaves the bus empty", () => {
      const bus = new PatchBus();
      bus.push(makePatch());
      bus.clear();
      expect(bus.latest()).toBeNull();
      expect(bus.list().length).toBe(0);
    });
  });

  describe("unapplied", () => {
    it("returns all when no cursor is set", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ capturedAt: "2026-01-01T00:00:00.000Z" }));
      bus.push(makePatch({ capturedAt: "2026-02-01T00:00:00.000Z" }));
      expect(bus.unapplied().length).toBe(2);
    });

    it("returns only patches strictly newer than the cursor", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ capturedAt: "2026-01-01T00:00:00.000Z", url: "a" }));
      bus.push(makePatch({ capturedAt: "2026-02-01T00:00:00.000Z", url: "b" }));
      bus.push(makePatch({ capturedAt: "2026-03-01T00:00:00.000Z", url: "c" }));
      bus.markApplied("2026-02-01T00:00:00.000Z");
      const unapplied = bus.unapplied();
      expect(unapplied.length).toBe(1);
      expect(unapplied[0]?.url).toBe("c");
    });

    it("returns empty after marking the latest", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ capturedAt: "2026-01-01T00:00:00.000Z" }));
      bus.markApplied();
      expect(bus.unapplied()).toEqual([]);
    });
  });

  describe("status", () => {
    it("reports counts and bounds", () => {
      const bus = new PatchBus();
      bus.push(makePatch({ capturedAt: "2026-01-01T00:00:00.000Z" }));
      bus.push(makePatch({ capturedAt: "2026-02-01T00:00:00.000Z" }));
      const s = bus.status();
      expect(s.count).toBe(2);
      expect(s.oldestAt).toBe("2026-01-01T00:00:00.000Z");
      expect(s.newestAt).toBe("2026-02-01T00:00:00.000Z");
      expect(s.appliedCursor).toBeNull();
    });

    it("reports nulls when empty", () => {
      const bus = new PatchBus();
      const s = bus.status();
      expect(s.count).toBe(0);
      expect(s.oldestAt).toBeNull();
      expect(s.newestAt).toBeNull();
    });
  });

  describe("subscribe", () => {
    it("calls listeners on push", () => {
      const bus = new PatchBus();
      const fn = vi.fn();
      bus.subscribe(fn);
      const p = makePatch();
      bus.push(p);
      expect(fn).toHaveBeenCalledWith(p);
    });

    it("returns an unsubscribe function", () => {
      const bus = new PatchBus();
      const fn = vi.fn();
      const unsub = bus.subscribe(fn);
      unsub();
      bus.push(makePatch());
      expect(fn).not.toHaveBeenCalled();
    });

    it("doesn't break the bus when a listener throws synchronously", () => {
      const bus = new PatchBus();
      const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      bus.subscribe(() => {
        throw new Error("boom");
      });
      const ok = vi.fn();
      bus.subscribe(ok);
      bus.push(makePatch());
      expect(ok).toHaveBeenCalledOnce();
      expect(stderr).toHaveBeenCalled();
      stderr.mockRestore();
    });

    it("logs async listener rejections without breaking the bus", async () => {
      const bus = new PatchBus();
      const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      bus.subscribe(async () => {
        throw new Error("async boom");
      });
      bus.push(makePatch());
      // Wait a microtask for the rejection to surface.
      await new Promise((r) => setImmediate(r));
      expect(stderr).toHaveBeenCalled();
      const calls = stderr.mock.calls.map((c) => String(c[0]));
      expect(calls.some((s) => s.includes("listener error") && s.includes("async boom"))).toBe(true);
      stderr.mockRestore();
    });
  });
});
