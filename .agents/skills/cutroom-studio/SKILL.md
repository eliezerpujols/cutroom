---
name: cutroom-studio
description: Create reusable animated Remotion elements for Cutroom Studio, expose editable template properties, and insert or customize existing Studio overlays in local videos.
---

# Cutroom Studio

Studio is Cutroom's library of reusable animated overlays. Use this skill when the
user asks for a new animated card, badge, counter, lower third or similar reusable
Remotion element, or asks to place one of those templates in an edit. Ordinary
color/motion effects belong in Effects, not in the Studio template registry.

## Find the implementation

The current checkout is `/Users/eli/Documents/Marketing/video resources/cutroom`.
Read `src/studio/registry.ts`, `src/studio/StudioElement.tsx`, and
`src/studio/StudioPanel.tsx` before changing the template contract. Consult the
Cutroom skill for project handling and Mobbin references for new UI unless the
user supplies a design. Preserve the compact controls and square preview tiles. Keep a visible corner
GripVertical handle, use `STUDIO_DRAG_TYPE`/`startLibraryDrag`, and retain both
click-to-insert and drag-to-timeline placement.

## Author a new template

- Register a stable, descriptive ID in `studioTemplates`, its dimensions, default
  duration in frames at 30 fps, and its fields. The current field types are text,
  color and number. Each has a label and default; number fields declare bounds,
  step and unit. Extend the shared field renderer and server validation together
  when a new type is genuinely needed. Avoid template-specific inspector markup.
- Add the React renderer under `src/studio/` and dispatch it from `StudioElement`.
  Keep imported component code in the application; project documents store only
  the template ID and serializable props, never executable code or JSX strings.
- Render from the supplied **local `frame`**, with no wall-clock animation,
  `Math.random`, timers or CSS keyframes. It already includes sourceIn and rate,
  so trimming and splitting preserve animation phase. A move only changes the
  clip's start. The clip's duration determines how long it exists; an animation
  property such as Turn time controls the animation inside that interval.
- Keep the component transparent outside its own bounds. Parent layout handles
  placement, scale, masks, effects, layer order and visibility. Internal transforms
  must not move the outer overlay box. Use relative sizing so previews and video
  exports scale identically. Accept and render defaults for missing props.
- Give the template an accurate thumbnail in `studioAssets`. Keep its reserved
  media ID `studio-${template.id}` and dimensions synchronized with the registry.
  These synthetic assets must not be persisted as imported media. Composition,
  timeline and overlay controls resolve them from the shared registry.
- Preserve existing template IDs and property meaning. For incompatible changes,
  introduce a new template version/ID instead of silently changing saved videos.

The Orbit card is the working example: front/back faces, perspective turn,
editable text, colors and turn time. Reuse the inspector's `Input`, `StyleColor`
and `StyleNumber`, and existing `OverlayControls`/`TimingControls`.

## Place or edit an element

Use `list_studio` to get template IDs and property definitions, `get_project` for
its current revision, and `set_studio_element` to add or update a clip. Timing is
frames at 30 fps. `set_clip_overlay` handles x/y/width; `edit_project` handles
move, trim, split and remove. The UI offers the same operations with undo.

For a cover-only Studio overlay, use `set_cover_element` with `kind: "studio"`,
the registered `template`, and optional `props`. Read `list_cover_elements`
for current cover element IDs and revision. `source_frame` selects a still pose.
Keep the Cover mode active when using the Studio library; its additions and
edits are saved in `cover.scene`. Normal `set_studio_element` edits the video
timeline. See the main skill's cover workflow for hiding inherited elements,
cover-specific captions and effects, and resetting the scene.

For a new Orbit card, pass `template: "orbit-card"` and omit `clip_id`.
The default duration is 120 frames (4 seconds), with centered x/y and width 75%.
Its editable props are `title`, `subtitle`, `tag`, `background`, `color`, `accent`
and `turnSeconds` (0.6–10 seconds). Colors are six-digit hex; text props allow up
to 160 characters. Get current defaults and bounds from `list_studio`, not from
a previous project's values. Example props: `{"title":"Eli","subtitle":"Creator",
"turnSeconds":2.4}`. Turn time is seconds; clip start/duration remain frames.

Lesson player, Social post and Price editor accept `language: "en"` for English
artwork and button labels; omitted language retains Spanish (`es`). Price editor
keeps its independent `amount` field. Spoken question uses its editable lead,
word and ending strings directly in the requested language.

To customize an existing card, pass its actual `clip_id`, current revision and
only changed props. Omitted props remain unchanged. `template` is for insertion;
it does not replace an existing instance's template. Read the returned `clipId`
and revision before placement or further edits. Reusing a template creates
independent instances; changing one instance does not change the others.
Adding a new template to the library requires source registration and a renderer;
`set_studio_element` inserts registered templates and does not generate code.
The global skill links directly to this repository source. Use the main Cutroom
skill's `scripts/call-mcp.mjs` fresh-connection bridge if this chat has an old tool
catalog; it exposes the same Studio tools without per-project installation.
`npm run check:global` verifies global registration and both skill links;
`npm run check:mcp` verifies Studio discovery. Restart the HTTP backend only when
its implementation changed and no export/provider job is running.

Studio effects are available through `list_effects` and `set_effects` with
`kind: "clip"` and the Studio clip ID. They are independent of template props.
Use the same expected-revision workflow for both.

Keep current revision checks. Never overwrite unrelated edits or silently add a
sample to the user's working cut for testing. Build a separate demo project when
the request is to author/test a library template. User projects belong in
`~/Documents/Cut Room`, not in the application checkout. Preserve the returned
editor instance URL and open a new tab for a new project.

## Verify and deliver

Studio overlays share the editor's crop, rotation and mirror transforms. For the
original-video/image-only local cutout and face tracking workflow, see
[camera tools](../cutroom/references/camera-tools.md); do not submit synthetic
Studio elements to the native vision worker.

Run the build and relevant tests. Verify actual insertion, prop editing, overlay
position/size, undo and save/reopen. Render a short local MP4 using the production
composition and inspect several frames including the animation's start, middle
and end. Confirm both legacy and layered composition paths resolve synthetic
assets, with no hidden media requirement. Use deterministic finite animation
math; reject invalid template IDs, unknown props and invalid field values.

Show the working example and identify its editable properties. Save a screenshot
of the UI. Report export failure or a concrete limitation rather than describing
unverified behavior as completed. Preserve the user's original edit.
