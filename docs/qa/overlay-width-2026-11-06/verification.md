# Unbounded media width — 2026-11-06

Removed the arbitrary 200% overlay width maximum from the shared layout field,
pointer resize math, keyboard controls, saved-project/API schema and MCP schema.
GIFs, images, video and Studio overlays keep their aspect ratio. Width is still a
finite number with a 2% minimum; other position and text/caption limits retain
their existing behavior.

Shared controls reuse the existing fields, suffix, validation, mixed values and
undo handling. `StyleNumber.max` is now optional. Media passes `maxWidth={null}`
to `PositionSizeControls`, whose default remains 96 for text/captions. Unbounded
canvas handles use the spinbutton role with no maximum, arrow-key increments,
and Home for the minimum. The old End-to-200 shortcut was removed.

Verification:

- `npm test`: 108 tests passed.
- `npm run build`: passed with the existing chunk-size advisory.
- `npm run check:global` and `npm run check:mcp`: passed. Fresh MCP discovery
  explicitly checks that overlay width has minimum 2 and no maximum.
- Regression tests accept 200.5%, 400%, 1200% and 10000%, reject nonfinite or
  undersized values, preserve limits on bounded number fields, and save/reopen
  1200% timeline and 2400% cover overlays through the project/API path.
- Native editor checks in isolated QA project
  `f28563c2-02e7-4c81-b337-0a88532f2ef2`: pointer resize reached 240.476%; keyboard
  resize advanced from 199.5% to 204.5%; entering 1200% showed Saved locally.
- Restarted the local service to load the expanded save schema after checking
  that rendering, vision, caption and dubbing jobs were idle.
