# Studio, Motion and Styles

Implemented November 4, 2026.

Studio is the reusable animated overlay library. The first template, **Orbit card**, turns through 360 degrees in perspective and returns to its front face. It exposes Name, Subtitle, Label, Card/Text/Accent colors and Turn time through the shared field controls. Overlay and Timing sections handle placement, size, start and duration. Click to add at the playhead, or drag the corner grip/thumbnail to a timeline location. Compatible video tracks are reused; overlaps use the existing track allocation rules. Quick drops are accepted on drag enter as well as drag over. Each insertion is one undo step.

Templates are compiled local React components. `src/studio/registry.ts` declares stable IDs, defaults, dimensions and editable fields. Project clips store only `studio: {template, props}` plus the existing timeline/overlay fields. Synthetic assets are resolved for both composition paths and never imported as files. Unknown templates/fields and out-of-range or incorrectly typed props fail server validation. Moving a clip preserves its local animation; trims and splits preserve source phase. Template Turn time and clip Duration are separate controls.

The library structure follows [VEED’s elements library](https://mobbin.com/screens/ed5e633f-d480-495d-82a3-ee7ce2058414?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp), with Cutroom controls and colors. The animation follows Remotion’s [local frame timing](https://www.remotion.dev/docs/timing). All animation math is frame-based, shared by preview and export. Library previews animate only on hover/focus and respect reduced motion.

Effects now has four sibling categories: Animation, Motion, Styles and Appearance. Each independently indicates applied effects with a blue dot and resets its own fields. Selection edits support video/image/Studio clips, timed text and captions; audio is excluded.

- Motion: Pulse, Explode, Shake, Handheld, Flash, Super zoom, Super shake, Echo and Tunnel. Intensity, Cycle and Repeat control the motion. One-shot motion returns to neutral after its cycle. Handheld is a simulated movement, not footage stabilization.
- Styles: Color shift, Flicker, Negative flash, Soft blur, Details, Sparkles and Fisheye, with intensity. Details uses contrast/saturation rather than AI sharpening. Fisheye uses a smoothed radial SVG displacement map; Echo uses SVG compositing of one content render, so media/audio are not duplicated. Sparkles use deterministic placement and timing.

`GET /api/studio` lists definitions. `POST /api/projects/:id/studio` adds or updates an instance using the current expectedRevision. MCP tools `list_studio` and `set_studio_element` expose these routes after MCP reconnection. Existing move/trim/split/remove and overlay tools now resolve Studio synthetic assets. The reusable authoring skill is in `.agents/skills/cutroom-studio/` and installed at `~/.codex/skills/cutroom-studio/`.

## Verification

Build and 40 tests pass. Tests cover Studio persistence without media, property validation, independent instances, split/trim phase, requested-track placement and audio-track fallback, independent effect resets, and finite deterministic motion on short clips. Browser verification covered insertion, property edits, save/reopen, overlay keyboard placement, Motion/Styles controls, visible status dots, Fisheye/Echo composition, corner-grip drop at 5.10 seconds and one-step undo. Toolbar scrolling remains independent when the timeline is tall.

Demo project: `2c295146-b860-4bdd-8496-2dbfaed83a4d`, `~/Documents/Cut Room/Studio-Orbit-card-demo-2c295146`. A four-second MP4 and PNG cover rendered successfully; front, perspective, back and returned-front frames were inspected. Screenshots are in `docs/qa/studio-2026-11-04/`. User edits in the original project were preserved; QA changed only the separate demo.

## Motion timing

Pulse, Explode, Flash, Super zoom, Echo and Tunnel expose a compact **Timing**
disclosure below Duration and Once / Loop. Rise reaches the peak, Hold stays at
that peak, and Return eases back to neutral. A small curve depicts their relative
lengths. Editing a phase updates total Duration; editing total Duration scales
custom phases proportionally. All times snap to one 30 fps frame (~33 ms), up to
30 seconds for the full cycle. Shake, Handheld and Super shake keep their original
oscillating duration controls.

`effects.motionTiming` optionally stores `{rise, hold, return}` in frames.
Unspecified timing preserves legacy motion exactly. Rendering uses the same phase
mapping for transforms, echo and tunnel shading in preview/export. The full cycle
repeats in Loop mode; short clips scale every phase together to end at neutral.
Editing a phase on a compatible multi-selection preserves each item's other
phase lengths. Reset Motion clears custom timing as well as the motion preset.
