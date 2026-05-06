# CSS Wrangler — downstream consumer contract

This document is the contract between CSS Wrangler and any tool that wants
to consume patches without going through the clipboard. Two paths are
supported:

1. **MCP path** — the canonical Claude Code integration. `css-wrangler mcp`
   exposes patches over the Model Context Protocol. Surface is documented
   in [`README.md`](./README.md).
2. **File-on-disk path** — a fallback for tools that don't speak MCP.
   `css-wrangler watch` writes the latest patch atomically to a stable
   location. Documented below.

The wire format on both paths is the same `Patch` JSON defined in
[`src/shared/types.ts`](../src/shared/types.ts).

## File-on-disk path

### Stable location

Default: **`~/.css-wrangler/latest.json`**.

Override with the `--path` flag (`css-wrangler watch --path ./somewhere.json`)
when a project wants the file checked into a workspace-relative location.

The directory is created if it doesn't exist (`mkdir -p` semantics).

### Format

The file contains a single JSON object — the same shape as `src/shared/types.ts:Patch`,
versioned by its `version` field. Today: `"version": "1.0"`.

Bumping that version is a breaking change for downstream consumers.
Backwards-compatible field additions don't bump the version; they're added
silently and consumers should ignore unknown fields.

Example:

```json
{
  "version": "1.0",
  "source": "css-wrangler",
  "url": "https://example.com/page",
  "capturedAt": "2026-05-06T18:00:00.000Z",
  "stylingSystem": "tailwind",
  "breakpoints": { "mobile": 375, "tablet": 768, "desktop": 1280 },
  "edits": [
    {
      "siblingGroup": null,
      "element": { "...": "..." },
      "changes": [
        {
          "state": "default",
          "breakpoint": null,
          "property": "padding",
          "from": "12px 24px",
          "to": "16px 32px",
          "tailwindHint": "py-4 px-8"
        }
      ]
    }
  ]
}
```

The full schema is the `Patch` type. Don't transcribe it here — read the
TypeScript directly so the doc can't drift from the source.

### Atomicity guarantee

The daemon writes via temp file + `rename(2)`:

1. Bytes are written to `<path>.tmp.<pid>.<random>`
2. `rename` atomically replaces the target

POSIX `rename` is atomic on the same filesystem. Consumers either see the
previous contents or the new contents — never a half-written file. No
locking is required on the read side.

### Consumer responsibilities

**Do:**

- Watch the file's `mtime` (or use `fs.watch` / `inotify` / `FSEvents`) to
  detect new patches. Don't poll the daemon's WebSocket — that's an
  internal detail of how the panel pushes to the daemon.
- Re-read the entire file on each change. Don't try to be clever about
  partial reads.
- Switch on `version` and ignore unknown fields. Treat unknown
  `stylingSystem` values as `"plain"` (safe default).
- Treat `siblingGroup` as a hint to apply N edits as a single source
  change. See the "Instructions for Claude Code" rules in the markdown
  patch header for the canonical behaviour.

**Don't:**

- Don't assume the file always exists. The daemon only creates it on the
  first push.
- Don't expect a history. The file is **last-write-wins**. Consumers that
  need history should use `css-wrangler mcp` (`get_patches` tool) or
  archive the file themselves.
- Don't expect concurrent multi-patch ordering guarantees. If two panels
  push at the same instant, the order is whichever reaches the daemon
  first. Each is a complete `Patch`; there's no merge.
- Don't write to the file. The daemon owns it. A consumer that wants to
  signal "applied" should track that out-of-band (e.g. its own state file
  or the MCP `mark_patch_applied` tool).

### Schema versioning policy

| Change | Version bump |
|---|---|
| Add an optional field | no |
| Add a required field | yes |
| Change the meaning of an existing field | yes |
| Remove a field | yes |
| Add a new `stylingSystem` enum value | no (consumers fall back to `"plain"`) |
| Add a new `state` enum value (`hover`, `focus`, …) | no |
| Add a new top-level type (e.g. `breakpoint`) | depends — if existing consumers can ignore it, no |

The current contract version is `1.0`. Any future bump (`1.1`, `2.0`) will
be announced in the repo's release notes.

## MCP path

The MCP server exposes the same `Patch` type via tools and resources. See
[`README.md`](./README.md) for the surface and [`apply-css-changes`](./src/mcp/prompts/apply-css-changes.ts)
for the prompt that wraps the standard application rules.

The two paths are independent — running both `mcp` and `watch` requires
they bind different ports (`--port`), and the panel currently pushes to a
single port (`9124` by default), so for v1 they're alternatives. A future
revision may add panel-side fan-out so both can listen.

## Source of truth for the application rules

The "Instructions for Claude Code" rules — DRY, prefer tokens, honor
`siblingGroup`, etc. — live in
[`src/shared/patch-instructions.ts`](../src/shared/patch-instructions.ts).
They're rendered into both the markdown clipboard header
(`src/panel/lib/patch.ts`) and the `apply-css-changes` MCP prompt. Don't
fork them in your consumer; import them or reference them by name.

## Out of scope

- Authentication. The daemon binds to `127.0.0.1` only.
- Multi-machine sync. The file lives in the user's home directory.
- Encryption. Patches contain DOM selectors and CSS values — treat them as
  the same sensitivity level as the page being edited.
- Schema migration tooling. If `1.0 → 2.0` happens, consumers handle it.
