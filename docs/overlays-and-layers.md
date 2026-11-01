# Overlays and layer order

Select a video or image clip, then choose **Make overlay** in the inspector's
Layout section, above Timing. If it shares a track with other clips, it moves to
a new video track directly above. If it is alone, its existing row, ID, name and
mute state are retained. Its timing, source window and audio are preserved. It
starts centered with an inset size that preserves the source aspect ratio. Empty
video rows are omitted when a non-overlay main video clip exists; this also hides
rows left by earlier versions without rewriting a project on load. The next
overlay conversion removes those redundant tracks from the saved edit.
The existing 12-media-track project limit still applies to new allocations;
a full project reports the same track-limit error without changing the clip.

When paused, select the overlay on the preview and drag it to move it. Drag a
corner to resize with its aspect ratio locked. Pink guides appear while dragging
when the overlay snaps to the canvas center or edges, using the same preview-pixel
threshold as text. Hold Shift to bypass snapping. Guides clear when the gesture
ends or is canceled and are not saved or exported. Oversized overlays can still
move for framing instead of being locked to the center. Size and position are also editable
in the inspector. **Full frame** removes the placement on the current track.
Undo restores the previous state. A drag creates one undo step; Escape cancels it.
Arrow keys move an overlay, Shift increases the step, and the focused corner
handles accept arrow keys, Home and End for resizing.

Each timeline row has a grip in the existing left label gutter: video, audio,
caption layers and individual timed-text rows. Drag up or down, then release at
the insertion line. Near the timeline edges it scrolls vertically. Escape cancels;
a focused grip also accepts Up/Down or Home/End. Only the order changes: source
windows and timeline starts/durations stay intact. Label padding, row widths and
sticky labels are retained. Reordering is one undo step.

The top row is the top visual layer. `project.layerOrder` stores namespaced keys
(`track:ID`, `caption:ID`, `text:ID`) top to bottom. New rows are inserted beside
their default neighbors; deleted row keys are ignored. Media tracks are synchronized
with that order for placement and top-video helpers. Old projects without this
field retain their existing render path until a layer is reordered or an overlay
is made. The same layer/placement renderer is used for preview, MP4 and cover PNG.
Global color adjustments apply to footage, not captions or text. Cover-only titles
remain above timeline layers.

MCP tools:

- `list_layers(project_id)` returns current keys, names and the revision.
- `reorder_layers(project_id, expected_revision, layer_keys)` requires every
  current key once, in top-to-bottom order.
- `set_clip_overlay(project_id, expected_revision, clip_id, enabled, placement)`
  creates a raised track only when the clip shares its source row. `placement.x/y` are center
  percentages (0–100); `width` is percent of composition width (2–200).
  Later updates reuse the track; `enabled=false` restores full-frame layout.

Keys come from project files and list results, never invented IDs. API writes are
revision protected and only notify matching instances; they do not navigate or
reload an existing editor tab. No API keys or provider credits are required.

## Design decisions

Target: selected-media layout controls, preview manipulation and the timeline's
left label gutter. Preserve: Inter, existing themes/tokens/components, timeline
measurements and editing gestures, original media, the user's open session, and
unrelated changes in this checkout.

| Requested move | Reference decision | Application |
| --- | --- | --- |
| Make and adjust an overlay | [Descript](https://mobbin.com/screens/8e7d9e06-8573-444d-978c-0d93e2341df3) shows size/position controls beside selected media; [Riverside](https://mobbin.com/screens/faaabc08-9019-4db4-8e80-64f5aa6a2dfa) shows corner handles on selected canvas media. | Contextual Layout section and direct canvas handles. The exact label and placement before Timing are our judgement. |
| Reorder layers using the existing padding | The user explicitly requested the left gutter and rearrangement. [VEED](https://mobbin.com/screens/4ff2167d-aacb-4352-96d2-5948119cb520) and [Vimeo](https://mobbin.com/screens/32f497f7-6e8e-453b-86b0-221373632881) show stacked timeline layers, but do not visibly establish a track-grip interaction. | A gutter grip, insertion line and keyboard alternative. This interaction follows the user's request, not an attributed Mobbin precedent. |

Validation boundary: TypeScript and production builds only. No browser gestures,
playback, real project writes, trial exports or before/after screenshots are run,
following the user's standing instruction. Runtime review remains with the user.
The Mobbin before/after comparison is therefore unavailable. Component compliance
is 4/5, provisional: existing Button, IconButton, Input and Slider controls are
reused; draggable timeline/canvas handles require editor-specific composition.
