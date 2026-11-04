# Local camera tools verification — 2026-11-04

Implemented crop, rotation, horizontal/vertical mirror, local person cutout and
face-centered camera tracking. Used Synthesia's [compact layout inspector](https://mobbin.com/screens/72569222-9eb6-48ee-9571-0526bf658ac5)
as an information-architecture reference while retaining shared Cutroom controls.

## Evidence

- `npm test`: 72 passing, including transform validation, crop aspect preservation,
  source-time tracking through trim/speed, original retention and derived-layer
  tracking rebasing. TypeScript/Vite production build passed; existing bundle-size
  warning remains.
- Actual Apple Vision processing on macOS: generated transparent video sequences,
  detected/smoothed face coordinates and generated a still PNG cutout. Output alpha
  contains fully transparent and fully opaque pixels. Original footage remains.
- UI: drag crop handles, reset and optional precision settings verified. Reset
  crop is in its popover header beside Close. UI cutout completion inserts/selects
  the new layer. Cancelled local analysis reaches cancelled without creating media.
- Fresh global MCP: 45 tools, version 2.11.0. Ran cutout start/status/apply, rejected
  duplicate apply, set transform and placement, copied a sequence project and
  confirmed every frame survived the copy.
- Rendered a real MP4 and companion cover from the production composition with
  a moved, mirrored, rotated and cropped transparent foreground over the source.
- Playback regression: the original HTML video clock could drift from the cutout
  image sequence. Preview now uses `@remotion/media` frame decoding and current
  cutout images participate in Player buffering. A bounded image lookahead avoids
  a fresh request on every visible frame. A three-second source/cutout pair was
  observed during playback (not only paused); captures showed aligned foreground
  without the reported doubled head. Preview uses canvas decoding; no HTML video
  element was active. No playback errors; removed objectFit prop warning.
- Opened the user's saved Reel 4 in a separate editor instance and played its
  existing 320-frame cutout with captions, overlays and audio through the full
  cutout range. Captures around 5s and 8.7s showed no doubled head; console had
  no warnings or errors. No timeline changes were made in this instance.

Private screenshots stay local under this directory and are ignored by Git:
`crop-handles.png`, `crop-precision.png`, `export.jpg`, `sync-playing.png`.
QA used separate projects; the user's project was not overwritten.

## Limits

AI tools require macOS and Xcode Command Line Tools. Segmentation includes all
detected people and can have imperfect edges. Tracking follows a face, not speech.
PNG sequences need disk space; keep the full project media directory. Loading
may briefly buffer on slow hardware instead of allowing layers to drift.
