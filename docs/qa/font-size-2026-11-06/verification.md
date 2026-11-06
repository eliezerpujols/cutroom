# Editable text size without an upper cap — 2026-11-06

Font Size previously exposed only a slider, capped at 200 px for text/cover
titles and 160 px for captions. All three now use the existing shared px field
with `StyleRange`'s `editable` and `unbounded` options. The number field has no
maximum. The slider expands to accommodate larger values and further gestures;
its maximum is frozen during a pointer drag to avoid moving the scale mid-drag.

Saved-project/API/MCP font-size schemas accept finite values of at least 16 px
without an upper cap. Existing spacing, box-width, focus, mixed values and undo
patterns are retained. Other StyleRange callers remain bounded by default.

Verification:

- `npm test`: 111 passing tests.
- `npm run build`: passed with the existing bundle-size advisory.
- `npm run check:global` and `npm run check:mcp`: passed. Fresh MCP discovery
  verifies uncapped font-size fields for text, cover titles and captions.
- Regressions cover editable/mixed fields, adaptive and bounded slider ranges,
  minimum/finite validation, and save/reopen with independent text, cover,
  caption-layer and caption-cue sizes of 600–1800 px.
- Native editor checks in isolated QA project
  `f28563c2-02e7-4c81-b337-0a88532f2ef2`: keyboard slider gestures reached 200 px
  and then 400 px. Direct entry accepted 1200 px with no input maximum. One Undo
  returned to 400 px; Redo restored 1200 px and showed Saved locally. The saved
  workspace confirmed fontSize 1200.
- Local service restarted after confirming no active render, vision, caption or
  dubbing work, so the running save API uses the new validation schema.
