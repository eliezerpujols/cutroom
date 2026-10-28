---
name: cutroom
description: Translate and dub videos with ElevenLabs, apply Sync lip sync, and open the result in Cutroom. Also create, reopen, edit, and export local Cutroom projects through its MCP, including trim, split, slip, audio adjustment, and moving clip selections together.
---

# Cutroom

Use the `cutroom` MCP to prepare the video and open its project in the local editor.
For translation, dubbing or lip sync, read [the dubbing workflow](references/dubbing.md).
The user can provide a video and target language in one request; complete the
provider workflow and open its finished result. Existing provider keys are loaded
from the local ignored environment, never from prompts or tool arguments.

English should sound natural and idiomatic, with B2 as the user's preferred
writing style. Automatic ElevenLabs dubbing cannot enforce a B2 script; explain
that limitation without claiming exact control. Use adapted mode when explicit
control of the translated text is requested; its Enterprise requirement is checked
before any generation. Do not silently replace an explicitly required mode.

## Project location

Default to `~/Documents/Cut Room`, with one folder per project. Keep imported
media, extracted audio, project documents and exports inside that project folder;
do not use the application checkout or the current working directory for user
work. No location question is needed when the user has not specified a path.

Continue in the current project when the user is editing it. If they name another
project, find and open that project instead. If they explicitly request a different
location for a new project, pass its parent folder as `projects_directory` to
`create_project`. Omit that field otherwise; the server supplies the default
(or a configured `CUTROOM_PROJECTS_DIR`). The tool returns the actual folder;
use it for any accompanying project documents instead of inventing another path.

## Prepare the project

- Find existing work with `list_projects`, then `get_project`. Project names can
  be ambiguous; use the returned ID when several names match.
- For a new video, use `create_project` with a name and absolute `media_paths`.
  Sources are copied into the project folder. `copy_project_id` creates an
  independent copy of an existing edit when a separate version is requested.
- Use the user's directions to choose the edits. Ask about meaningful creative
  choices only when the request does not establish them; continue independent
  preparation while waiting. Do not add a confirmation step for routine edits.
- Read the saved project to obtain real clip/asset IDs and its `revision`.

## Edit the timeline

Pass the current revision as `expected_revision` to `edit_project`. All timeline
timing is frames at **30 fps**; convert seconds to frames with `round(seconds*30)`.

| Action | `value` |
| --- | --- |
| `trim_start` | Frame delta at the left edge. Positive removes the beginning and moves its start later. |
| `trim_end` | Frame delta at the right edge. Negative removes the end. |
| `move` | Absolute timeline start frame. |
| `slip` | Source frame delta; timeline position/duration stay fixed. Trim first if the full source is already used. |
| `split` | Absolute timeline playhead frame inside the clip. |
| `speed` | Playback multiplier from 0.25 to 4. |
| `volume` | Linear gain from 0 to 2; 1 is 100%. |
| `mute` | 1 to mute, 0 to unmute. |
| `fade_in`, `fade_out` | Duration in timeline frames. |
| `remove` | No value. Removes the timeline clip, leaving the source media. |

Splitting creates a new clip ID: inspect the returned project before subsequent
operations on the new piece. A video clip's embedded audio and separate audio
clips are independent; edit both only when the user's intended sync requires it.
`extract_audio` adds a WAV to the media library without changing the timeline.
The UI can detach audio to a separate track.
Its upper timeline divider can be dragged to change height (double-click resets
automatic sizing). Command/Ctrl + mouse wheel zooms around the cursor. These are
view preferences and do not change clip timing or edit history.

Audio fades are visible as ramps and attenuated waveforms in the timeline.
Selected audio clips expose draggable fade handles; the inspector also offers
Fade in / Fade out sliders with editable seconds. Playback & content provides
speed controls and a Content start source window. Dragging that window slips
the source without moving or resizing the timeline clip; Earlier / Later move
one source frame. Speed changes the clip's duration.
Timing offers Start at and Duration sliders with editable seconds and an Ends at
readout. Each slider gesture is a single undo step; overlapping clips are assigned
separate matching tracks, as when dragging on the timeline.

In the UI, dragging empty timeline space selects clips across video and audio
tracks. Drag any selected clip to move the selection together; Shift-click
adjusts the selection. The inspector's Selection start moves the whole group.
For the equivalent MCP edit, apply the same frame delta to every selected clip's
absolute `move` value in one `edit_project` operations batch. Preserve relative
spacing and audio sync; do not clamp each clip separately at frame zero.

Video and audio clips that overlap in time occupy separate tracks. Adding, moving
or extending a clip into another clip's space automatically assigns it a free
track of the same kind above, creating one if needed. Touching edges are not
overlaps. Inspect the returned project for updated
`trackId` values before later edits. Tracks are ordered top to bottom: the upper
video track appears above lower ones in both preview and export. Overlapping
audio clips mix from separate visible tracks; new tracks inherit the occupied
track's mute state when separating an overlap.

If a revision conflict occurs, read the latest project and reconcile the requested
change. Do not replay stale edits or discard an unsaved browser draft. The editor
keeps a local draft and reports the conflict. Missing media should be reconnected
with **Locate file** in the media panel, preserving the existing source windows.

## Show and export

- `open_project` accepts a project name, ID, absolute folder or `project.cutroom`
  path. It updates the focused connected editor tab. If no editor tab is open,
  use the returned `editor_url` with the available browser tool.
- In the macOS editor, **Open project…** opens the system file selector for
  `project.cutroom`. Users do not need to type a path. The project opens from
  its original folder, keeping relative media references; canceling keeps the
  current project open.
- `export_project` renders MP4, WAV or MP3 locally. Optional ranges are start
  inclusive/end exclusive frames. Poll `export_status` until completed or failed;
  on failure, report the actual error rather than claiming an export exists.
- Exports live inside that project's `exports/` folder. Verify the returned
  result and present a usable local file or download link.
- New exports and dubbed MP4 deliverables finalize with minimal optional tags,
  excluding encoder/software/version comments. Codec information remains. This
  is not a guarantee about platform AI labels or content provenance; do not claim
  the media is undetectable or AI-free because metadata was cleaned.
- To move or back up work, keep `project.cutroom`, `media/`, `thumbs/`, and
  `exports/` together. The manifest alone does not include the media.

## Setup when tools are unavailable

Use the checkout's README for installation. The MCP entry point is
`server/mcp.ts`; on macOS register the absolute `Cutroom MCP.command` path with
`codex mcp add cutroom -- /bin/zsh <absolute-launcher-path>`. A new Codex session
may be needed after registration. Run from the checkout with Node 22.12+,
`npm ci`, `npm run build`, and FFmpeg installed or `FFMPEG_PATH` configured.
Local editing needs no provider keys. For dubbing, check `integration_status`;
reuse configured `ELEVENLABS_API_KEY` and `SYNC_API_KEY` without asking again.
Only report a missing variable when the tool actually says it is missing.
