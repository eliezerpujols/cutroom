# Covers and visual adjustments

Read `get_project` first for the current revision, media and clip IDs. All these
features run locally without provider keys or credits. Save changes with the
current `expected_revision`. Open returned editor URLs in a **new tab**, preserving
the `instance` and `view` parameters; never replace another editing session.

## Cover

`set_cover` chooses `frame` in timeline frames at 30 fps and optional
`show_captions` (default false). A cover is separate from the timeline: it does
not insert a still, change timing, or burn its title into an MP4. Use
`export_cover`, then poll `export_status` to obtain its PNG in `exports/`.
The PNG uses the project aspect ratio and dimensions. The square timeline tile
is a cover shortcut, not a square crop setting. Choose a frame with visual media;
gaps cannot be exported as a cover. If edits shorten the timeline, its saved
frame is clamped to the last available frame when displayed/exported.

`texts` replaces **all** cover text blocks; omit it to preserve them. To change
one title, read and include all blocks, retaining their IDs. New blocks need
only `text`; IDs and default styling are generated. Use `texts: []` to remove
all titles. Up to 12 blocks are supported, with 500 characters each.

Defaults: Inter, extra bold (800), black on a white rounded card, centered near
the top. Each block can set:

| Fields | Meaning |
| --- | --- |
| `fill` | `box`: one rounded card; `lines`: separate highlighted lines; `none`: text only. |
| `fillColor`, `color` | Six-digit hex background and text colors. Yellow highlight reference: `#ffe501` with `#111111` text. |
| `fontFamily` | `Inter Variable`, `DM Sans Variable`, or `Manrope Variable`. |
| `fontSize`, `fontWeight`, `italic` | 16–200 composition pixels, 400–900, boolean. Manrope italic is synthesized. |
| `stroke`, `strokeColor`, `strokeWidth` | Optional outline, hex color, 0–12 composition pixels. |
| `padding`, `radius` | Background padding 0–60 and corner radius 0–100 composition pixels. |
| `x`, `y`, `width` | Center position in 0–100% of the canvas; box width 10–96%. |
| `align` | `left`, `center`, or `right` inside the text box. |

The UI's square **Cover** tile opens its frame filmstrip and exact preview.
Select a title to style it on the right; drag it in the canvas or use arrow keys
to position it. Frame changes and text gestures use undo. The caption toggle
affects only the still; the video keeps its own caption layers.

## Video and image adjustments

`set_visual_adjustments` changes the **entire edit** when `clip_ids` is omitted.
Provide video/image clip IDs for clip-specific corrections. Audio clips are
rejected. `reset: true` starts that scope from neutral before applying the patch;
otherwise unspecified values are preserved.

| Control | Values |
| --- | --- |
| `preset` | `none`, `clean`, `warm`, `cool`, `cinema`, `mono`. |
| `intensity` | Preset strength 0–100%, default 100. |
| `exposure` | -2 to 2 EV, neutral 0. |
| `brightness`, `contrast`, `saturation` | -100 to 100, neutral 0. |
| `warmth` | -100 cool to +100 warm, neutral 0. |
| `tint` | -100 green to +100 magenta, neutral 0. |

Clip adjustments render first, then edit-wide adjustments. They affect video,
images and cover footage in the shared preview/export composition. Captions and
cover text remain outside those filters, keeping their chosen colors. These are
creative RGB controls, not camera RAW or calibrated professional color grading.

The left **Adjust** tool controls the whole edit. A selected visual clip has its
own **Adjustments** section in the right inspector. **Original** removes the
preset while keeping manual values; **Reset all adjustments** clears both for
that scope.

`import_media` accepts PNG, JPEG and WebP in addition to video/audio. Still images
occupy video tracks, initially five seconds, and can be trimmed, extended,
split, duplicated and adjusted. They have no source slip, playback speed or
embedded audio controls. Keep their copied files in the project media folder.
