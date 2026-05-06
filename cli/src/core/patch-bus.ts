import type { Patch } from "../../../src/shared/types";

export const RING_CAPACITY = 50;

export interface PatchBusStatus {
  count: number;
  oldestAt: string | null;
  newestAt: string | null;
  panelConnected: boolean;
  appliedCursor: string | null;
}

type Listener = (patch: Patch) => void;

/**
 * In-memory ring buffer of patches pushed by the extension panel.
 *
 * Restart wipes the buffer (CLAUDE.md invariant 1 — session-only state).
 * Designed as a shared module: `css-wrangler watch` (Linear 202-501) will
 * subscribe to the same bus to write patches to disk.
 */
export class PatchBus {
  private buffer: Patch[] = [];
  private appliedCursor: string | null = null;
  private panelConnected = false;
  private readonly listeners = new Set<Listener>();

  push(patch: Patch): void {
    this.buffer.push(patch);
    if (this.buffer.length > RING_CAPACITY) {
      this.buffer.shift();
    }
    for (const fn of this.listeners) {
      try {
        fn(patch);
      } catch {
        // listeners are advisory; don't let one consumer break the queue.
      }
    }
  }

  /** Newest patch, or null. Idempotent — does not advance the cursor. */
  latest(): Patch | null {
    return this.buffer.length === 0 ? null : (this.buffer.at(-1) ?? null);
  }

  /** Newest-first, capped at `limit`. Default 20. */
  list(limit = 20): Patch[] {
    if (limit <= 0) return [];
    const slice = this.buffer.slice(-limit);
    return slice.reverse();
  }

  /**
   * Mark a patch as applied. No-arg = mark the most recent. Returns the
   * `capturedAt` that was marked, or null if the queue was empty.
   */
  markApplied(capturedAt?: string): string | null {
    if (capturedAt) {
      const exists = this.buffer.some((p) => p.capturedAt === capturedAt);
      if (!exists) return null;
      this.appliedCursor = capturedAt;
      return capturedAt;
    }
    const newest = this.latest();
    if (!newest) return null;
    this.appliedCursor = newest.capturedAt;
    return newest.capturedAt;
  }

  /** Empty the buffer. Returns the count that was cleared. */
  clear(): number {
    const n = this.buffer.length;
    this.buffer = [];
    this.appliedCursor = null;
    return n;
  }

  /** Patches strictly newer than the applied cursor, newest-first. */
  unapplied(): Patch[] {
    if (!this.appliedCursor) return [...this.buffer].reverse();
    return this.buffer.filter((p) => p.capturedAt > (this.appliedCursor ?? "")).reverse();
  }

  status(): PatchBusStatus {
    const oldest = this.buffer[0] ?? null;
    const newest = this.buffer.at(-1) ?? null;
    return {
      count: this.buffer.length,
      oldestAt: oldest?.capturedAt ?? null,
      newestAt: newest?.capturedAt ?? null,
      panelConnected: this.panelConnected,
      appliedCursor: this.appliedCursor,
    };
  }

  setPanelConnected(connected: boolean): void {
    this.panelConnected = connected;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}
