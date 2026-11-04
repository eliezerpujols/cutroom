# Effects and batch media editing

Implemented 2026-11-04. Effects use the same rendering functions in preview and export.

## Effects panel

Select videos, images, timed text or caption cues, then open Effects. In and Out use square previews with the selected video's thumbnail (Aa for text), short names, and hover/keyboard-focus animation. Reduced-motion preference keeps previews static. Choose None, Fade, four slide directions, Zoom in/out, Blur or Wipe. Duration appears after choosing an effect; mixed fields remain blank until edited. Animation and Appearance are sibling tabs. In, Out and Between live only inside Animation. Appearance contains static blur and rounded/circle masks, independent of animation timing. Blue dots indicate configured effects in each category and timing tab, including mixed selections. Reset affects only the open category on the current selection, preserving the other category.

Between offers Crossfade, Slide and Wipe for a clip immediately following another full-frame visual clip on the same track. It does not bridge gaps, move clips, shorten the timeline or crossfade audio. The outgoing source continues into its available source handles, then freezes if exhausted. Overlays use In/Out. Durations are 1–90 frames; short clips proportionally fit their entrance and exit without overlapping.

The compact layout follows [VEED's visual effects grid](https://mobbin.com/screens/6e616873-a208-42fb-8a19-e6175a55166b?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp) and [Canva's transition thumbnails and tabs](https://mobbin.com/screens/f4f0c6ef-911c-47fc-9119-40627b7234bf?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp), using Cutroom's shared controls and existing colors. The previous callout and large section headings were removed.

## Multi-selection

The selection inspector now exposes Adjustments, Playback & content and Clip audio when applicable. Adjustments edits only the changed field, preserving other values on each selected clip. The Adjust tool can target Selected clips or Entire edit. Speed preserves source windows and timeline starts, changing duration; include detached audio when changing video speed to keep it synchronized. Earlier/Later move source windows by one frame with a common delta limited by the most constrained source. Images are excluded from playback edits. Audio volume, mute and fades apply to selected clips that have audio.

## Text shadows

Text, cover text and captions share two compact shadow rows: Drop shadow and Inner shadow can be enabled together. Each row has an independent visibility control and opens a Radix popover with Color and a two-column Opacity / Blur / X / Y grid, using the existing StyleColor and StyleNumber fields. Closing or pressing Escape restores focus without clearing the editor selection. Hidden shadows retain their settings.

Optional `shadow.drop` and `shadow.inner` patches preserve the original flat single-shadow fields. Nested caption overrides merge per property and whole-layer edits clear only matching overridden properties. Both SVG shadows derive independently from the glyph alpha; the drop shadow is composited below the inner-shaded text. Legacy single-drop rendering stays unchanged. See [verification](qa/shadows-2026-11-04/verification.md).

## Verification

`npm run build` passed (existing large-bundle warning). `npm test`: 34/34 pass, including seven new invariants for selected adjustments, speed, slip, effects persistence, animation endpoints, transition adjacency and shadow inheritance. Browser checks in a separate QA project verified batch Warm look, 2× speed, selection-only effects, persistence and one-step undo. A four-second MP4 and companion cover rendered successfully; sampled frames were inspected. User project remained revision 41, unchanged from the pre-work snapshot.

## Information architecture follow-up

The separation follows [Jitter’s Design / Animate views](https://mobbin.com/screens/2708dd4d-6833-4b73-bb1d-9f7df923fdab?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp), inspected on Mobbin. Existing thumbnail styling and Duration alignment remain. Verified keyboard navigation between categories, independent rendered controls, and retained selected values in the user’s existing editor tab. Production build passed.

## Timeline transition indicators

Each effective Between transition has a small junction button, a duration label in seconds, and a striped range covering its actual playback interval on the incoming clip. The range scales with timeline zoom while the button stays easy to target. Clicking it selects the incoming clip, seeks to the join and opens Animation → Between, including when Appearance was previously open. Only adjacent, visible full-frame clips on the same track produce markers; gaps and None produce none. The duration helper is shared with rendering, including clamping to short clips. The range does not intercept clip dragging or trimming.

The junction control follows the [Canva transition reference](https://mobbin.com/screens/f4f0c6ef-911c-47fc-9119-40627b7234bf?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp). Build and 35/35 tests pass. Browser verification confirmed both existing transitions, reopening Between from Appearance, and 1× → 1.25× zoom changing the range from 14.21px to 17.77px while keeping its button at 23px. This verification changed only editor selection, playhead and zoom, without editing the user's clips. See `docs/qa/effects-2026-11-04/timeline-transition-editor.png` and its timeline detail.
