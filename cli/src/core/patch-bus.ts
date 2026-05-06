import type { Patch } from "../../../src/shared/types";

export const RING_CAPACITY = 50;

export interface PatchBusStatus {
  count: number;
  oldestAt: string | null;
  newestAt: string | null;
  appliedCursor: string | null;
}

type Listener = (patch: Patch) => void | Promise<void>;

/**
 * In-memory ring buffer of patches pushed by the extension panel.
 *
 * Restart wipes the buffer (CLAUDE.md invariant 1 — session-only state).
 * Shared across subcommands: `mcp` reads via tools/resources; `watch`
 * subscribes to write the latest patch to disk.
 */
export class PatchBus {
  private buffer: Patch[] = [];
  private appliedCursor: string | null = null;
  private readonly listeners = new Set<Listener>();

  push(patch: Patch): void {
    this.buffer.push(patch);
    if (this.buffer.length > RING_CAPACITY) {
      this.buffer.shift();
    }
    for (const fn of this.listeners) {
      let result: void | Promise<void>;
      try {
        result = fn(patch);
      } catch (err) {
        logListenerError(err);
        continue;
      }
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch(logListenerError);
      }
    }
  }

  /** Newest patch, or null. Idempotent — does not advance the cursor. */
  latest(): Patch | null {
    return this.buffer.at(-1) ?? null;
  }

  /** Newest-first, capped at `limit`. Default 20. */
  list(limit = 20): Patch[] {
    if (limit <= 0) return [];
    return this.buffer.slice(-limit).reverse();
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

  /**
   * Patches strictly newer than the applied cursor, newest-first.
   *
   * Relies on `Patch.capturedAt` being an ISO 8601 timestamp — those sort
   * lexicographically the same as chronologically. Two patches in the same
   * millisecond would compare equal and both be considered "applied" once
   * either is marked.
   */
  unapplied(): Patch[] {
    if (!this.appliedCursor) return [...this.buffer].reverse();
    const cursor = this.appliedCursor;
    return this.buffer.filter((p) => p.capturedAt > cursor).reverse();
  }

  status(): PatchBusStatus {
    const oldest = this.buffer[0] ?? null;
    const newest = this.buffer.at(-1) ?? null;
    return {
      count: this.buffer.length,
      oldestAt: oldest?.capturedAt ?? null,
      newestAt: newest?.capturedAt ?? null,
      appliedCursor: this.appliedCursor,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

function logListenerError(err: unknown): void {
  process.stderr.write(
    `[patch-bus] listener error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
}
