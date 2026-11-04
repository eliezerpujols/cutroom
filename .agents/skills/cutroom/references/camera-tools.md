# Transforms and local camera tools

Use `set_media_transform` with project ID, current revision, clip IDs and a
`transform` patch. It preserves unrelated transform, timing, style and audio fields.
Rotation is -180..180 degrees; `flipX` and `flipY` mirror horizontally/vertically.
`crop` supplies left/top/right/bottom removed percentages, each 0..90 with opposing
sides totaling less than 95. Reset crop with all four sides zero. Use the existing
`set_clip_overlay` for independent placement and size.

In the editor, Crop enters direct canvas editing with eight handles and a thirds
grid. Arrow keys adjust focused handles; Shift uses larger steps. Done keeps the
crop, Cancel restores the entry value. Numeric percentages are optional under the
separate Crop settings icon. Reset crop belongs in that popover's header beside
Close. Reuse shared Transform and position/size controls for video and images.

## Local AI workflow

The five camera tools are globally registered with MCP 2.11.0:
`set_media_transform`, `start_local_vision`, `local_vision_status`,
`cancel_local_vision` and `apply_local_vision`.

1. Read the saved project for an original video/image clip ID. Studio and derived
   cutout sequences are not analysis sources.
2. Call `start_local_vision` with `project_id`, `clip_id` and `kind` (`cutout` or
   `track`). The selected source range and speed are processed locally.
3. Poll `local_vision_status` with its `job_id` until completed, failed or cancelled.
   Honor cancellation with `cancel_local_vision`; never report a failed job as ready.
4. On completion, read the latest revision and call `apply_local_vision` once.
   Changed source asset/trim/duration/speed requires a new analysis. Revision
   conflicts require reconciliation, not overwriting an unsaved editor draft.

Cutout retains the original clip and adds a silent transparent foreground layer
above it at the same timeline position. Images produce RGBA PNG; videos use an
RGBA PNG sequence at 30 fps plus an alpha WebM library preview. Keep the entire
project `media/` directory: the WebM alone is not the editor/export sequence.
Project copies preserve every sequence frame. The new layer can be moved,
cropped, rotated, mirrored or styled independently. MP4 compositing flattens its
transparency over lower layers.

Tracking smoothly pans and slightly zooms the camera to keep a face centered.
It starts with the largest face, follows the nearest detection and holds through
missing detections. It does not identify the active speaker from audio. Tracking
keys use source-frame coordinates, so later trims and speed changes retain their
mapping; derived cutouts rebase these keys to their baked source time.

## Requirements and limits

Both operations use Apple's built-in Vision models on macOS, with FFmpeg for
local frame preparation. Xcode Command Line Tools compile the bundled Swift
worker on first use. No footage uploads, cloud inference or provider credits are
involved. On other platforms the two AI controls are unavailable; ordinary
transforms remain available. Processing is serialized and may take time and disk
space. Cutout currently retains all detected people, without individual-person
selection; hair, rapid motion and difficult backgrounds can have imperfect edges.

The preview uses Remotion's frame-synchronized video decoder. Transparent frames
use a bounded lookahead of mounted images and participate in Player buffering.
Do not replace this with independently running HTML video or drop loading waits:
the foreground can lag behind the original during playback even when pause/seek
looks correct. Check real playback, not only still frames, when changing this path.
