# Existing-track drops — 2026-11-06

GIPHY insertion previously forced a new track even for an explicit drop onto a
free existing lane. Converting the newly inserted clip to an overlay could also
allocate another lane. General media placement only checked upper lanes before
rejecting insertion at the 12-track limit.

GIPHY clips now have their fitted overlay geometry before placement. Explicit
drops reuse the requested free video lane; ordinary placement still separates
overlaps. At the limit the common video/audio placement helper also searches
compatible lower lanes, retaining mute state. Fully occupied intervals still
reject insertion without replacing media. Explicit requests to create a new
lane still respect the track limit. Intermediate pointer-drag collisions keep
the last valid preview; a rejected final drop reports the existing error.

Verification:

- `npm test`: 103 tests passed, including regressions for GIFs, clips, stickers,
  explicit track drops, lower-lane gaps, moves, batch arrangement, audio,
  preserved clips/layer order/mute state and genuinely full projects.
- `npm run build` passed with the existing chunk-size advisory.
- `npm run check:global` and `npm run check:mcp` passed; 51 tools discovered.
- Native editor drag checked in isolated project
  `f28563c2-02e7-4c81-b337-0a88532f2ef2`, using a locally generated GIF and
  synthetic image. The GIF appeared on existing Drop target 1 with the project
  still at 12 tracks. No provider search or paid generation was used.
- Source review confirms GIFs, video, images, Studio and audio share the repaired
  placement helper. GIPHY regressions exercise insertion without network access.

Only the placement correction and its documentation/tests are included; pending
Studio artwork changes remain separate.
