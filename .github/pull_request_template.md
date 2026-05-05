## What

<!-- One paragraph: what's changing and why. -->

## Test plan

<!-- How did you verify? Manual steps, screenshots, etc. -->

## Token + Figma sync

If this PR touches `DESIGN.md`:

- [ ] Ran `pnpm tokens` — committed regenerated `tokens.css` outputs (panel + web).
- [ ] Ran `pnpm tokens:push` — committed the regenerated `.figma/push-patch.js`.
- [ ] Pasted `.figma/push-patch.js` into Figma's Plugin-API runner and ran it.
- [ ] Ran the EXPORT_SNIPPET in Figma — saved the result over `.figma/figma-state.json`.
- [ ] `pnpm tokens:check-figma` passes locally (CI will also gate this).

If this PR does **not** touch `DESIGN.md` but does touch components in Figma's domain (panel/plugin/web component shapes), no token-sync action is required. Code is the source of truth — the Figma file gets reconciled to it on every DESIGN.md change.

See `.claude/figma-sync.md` for the full workflow.
