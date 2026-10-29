# Manual text during a video

Use manual text for titles, labels, subtitles typed by the user, or a call to
action with a chosen display interval. It is independent of speech recognition
and cover-only text. No provider key, generation, or credits are involved.

Read `get_project` for the current revision and `project.texts` IDs. Use:

- `add_text`: required `text`, optional `start` and `duration` in **30 fps frames**,
  and optional `style`. Defaults: frame 0, 90 frames (three seconds), centered
  white Inter with a black outline. x/y/width are percentages; font size, outline,
  padding and corner radius are composition pixels, as in cover styling.
- `edit_text`: batch `operations`, each with the text `id` and an action.
  `update` accepts `values` for text, start/duration, font, color, fill, outline,
  alignment, position, or `muted`. `split` needs an absolute `frame` strictly
  inside the interval. `duplicate` preserves styling and defaults to directly
  after the original; `values.start` can override that placement.
- `remove_text`: remove one `text_id`, leaving media, automatic captions and
  cover titles untouched.

Pass `expected_revision` for every edit. Inspect returned IDs after splitting or
duplicating. New text is placed above older text. Each text object has its own
visible timeline row, so overlapping titles do not hide one another's timeline
controls. Up to 100 text objects, each with 500 characters, are supported.

Text is visible from `start` inclusive until `start + duration` exclusive. A title
can extend the timeline past the footage, in which case it renders over black.
Manual text is burned into MP4 and appears in a cover PNG when active at its
selected frame. The cover's caption toggle affects speech-caption layers only.
SRT/VTT export uses automatic caption layers, not these independent title objects.

The Text panel offers Add text and Heading / Subtitle / Body presets before the
collapsible Auto-transcript option. UI creation uses the current playhead and a
three-second default. Select text to edit its content, timing and style on the
right. While paused, drag it on the canvas, or use arrow keys for position.
Timeline dragging changes timing; its edge handles trim the display interval.
Split, duplicate, hide and remove are available. Media multi-selection remains
separate; manual text and automatic caption cues are edited individually.

Returned URLs include a new editor instance, `view=text`, and the focused text
ID when available. Open them in a **new tab** and preserve all query parameters.
The new instance opens at that title's start. Existing editing tabs receive only
a project-scoped change notice and are never navigated or reloaded automatically.
