# Highlighted-word animation — November 4, 2026

- Removed the duplicate caption-wide transition picker from Display. None/Fade/Pop now live under Animation inside the Highlight words popover.
- Added optional highlightMotion independently of legacy motion. Rendering applies its entrance only to the active word using word-local timestamps, with no caption-wide fade/scale. It composes with per-letter/word Effects and renders through the same composition in editor and MP4 export. Old motion values keep their existing rendering; no saved user project was migrated.
- Added schema, selection patch and inheritance support. Global MCP 2.10.0 edit_captions exposes highlightMotion; skill and caption reference explain the distinction.
- Added tests for finite/short-word endpoints, active-word-only HTML styles with/without text effects, cue/layer edits, persistence, invalid values and legacy motion preservation. All 66 tests passed. Build, global registration check, fresh MCP check and diff check passed (existing bundle-size warning).
- Restarted the local server for schema/render bundle updates after confirming no active caption/dubbing jobs and no export child process.
- Browser verified no caption transition controls outside the popover, selected Pop, and confirmed only the first active word “Every” receives scale(0.9). API read-back confirmed highlight=true and highlightMotion=pop persisted independently of motion=none. QA changes undone; user's project untouched.
- `highlight.png` is local and ignored by Git.
