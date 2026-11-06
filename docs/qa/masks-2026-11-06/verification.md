# Shape masks — 2026-11-06

Rounded previously used `inset(0 round 8%)`, which resolved horizontal and
vertical radii independently. Circle used an ellipse filling the viewport.

Media now passes its composition or overlay viewport to the shared effect
layer. Rounded uses one radius, 8% of the shorter side, in composition pixels.
Circle uses a centered `circle(closest-side)`, cropping the longer side without
stretching the media. Square library tiles keep their proportional preview.
Saved effect IDs, schemas and MCP patch semantics are unchanged.

Verification:

- `npm test`: 98 passing tests, including three mask regressions.
- `npm run build`: passed; existing chunk-size advisory remains.
- `npm run check:global` and `npm run check:mcp`: passed, 51 tools discovered.
- Rendered actual `EditComposition` media overlays in square, landscape and
  portrait viewports through the Remotion export renderer. Local results:
  `masks.png` and `cover-masks.png` (ignored QA artifacts).
- Pixel bounds of the circles: 220 × 220, 180 × 180 and 180 × 180.
- Rounded corner curvature matches across axes within edge antialiasing;
  timeline and cover renders are pixel-identical.
- Checked the existing Rounded Studio clip in the rebuilt local editor at
  00:30.56 without changing its saved project settings.
- React review: viewport geometry is derived during rendering, with no new
  state, effects, DOM measurements or event handlers.

The separate in-progress `CommunitySelection.tsx` change is outside this fix.
