import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Patch } from "../../../src/shared/types";

/**
 * Atomic write: stage the bytes in a sibling temp file, then `rename` onto
 * the target path. POSIX `rename` is atomic on the same filesystem, so
 * downstream consumers either see the previous contents or the new contents
 * — never a half-written file.
 *
 * The temp suffix includes the pid + a random tag so concurrent writers
 * (multiple watch processes — uncommon but legal) don't clobber each other's
 * staging files.
 */
export async function writePatchAtomic(path: string, patch: Patch): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const suffix = `.tmp.${process.pid}.${Math.random().toString(36).slice(2, 10)}`;
  const tmp = `${path}${suffix}`;
  try {
    await writeFile(tmp, `${JSON.stringify(patch, null, 2)}\n`, { flag: "w", mode: 0o644 });
    await rename(tmp, path);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}
