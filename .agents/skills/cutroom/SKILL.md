---
name: cutroom
description: Translate and dub videos with ElevenLabs, apply Sync lip sync, use sound effects, add timed text, generate and style captions, design covers, position video/image overlays, reorder layers, adjust video/image color, use reusable Studio overlays and visual/text effects, and manage local Cutroom projects or clear project exports through its MCP.
---

# Cutroom

Use the `cutroom` MCP to prepare the video and open its project in the local editor.
For translation, dubbing or lip sync, read [the dubbing workflow](references/dubbing.md).
For the reusable sound library and audio placement, read [sound effects](references/sounds.md).
For authored titles and text during a video, read [manual video text](references/text.md).
For automatic transcription or caption styling, read [the captions workflow](references/captions.md).
For overlays, layer order, cover text, frame selection, filters, or video/image color corrections, read
[the visual editing workflow](references/visuals.md).
For animation, Motion/Styles/Appearance, text effects, dual shadows and current MCP coverage, read
[effects and typography](references/effects.md).
The user can provide a video and target language in one request; complete the
provider workflow and open its finished result. Existing provider keys are loaded
from the local ignored environment, never from prompts or tool arguments.

English should sound natural and idiomatic, with B2 as the user's preferred
writing style. Automatic ElevenLabs dubbing cannot enforce a B2 script; explain
that limitation without claiming exact control. Use adapted mode when explicit
control of the translated text is requested; its Enterprise requirement is checked
before any generation. Do not silently replace an explicitly required mode.

## Building Cutroom features

Before creating a new Cutroom feature or redesigning its UI, consult the Mobbin
plugin and inspect relevant reference screens, unless the user has provided the
design. Reuse Cutroom's existing components, typography, spacing, colors and
interaction patterns; references guide structure, not a replacement visual theme.
Keep editor panels compact: short labels, small existing type, and controls that
appear when relevant. Avoid explanatory callouts and repeated helper paragraphs.
For effects and transitions, use square image preview tiles with short names;
show the effect on hover or keyboard focus and respect reduced motion. Verify the
rendered result in the editor before presenting it.

For reusable animated Remotion elements, use [Cutroom Studio](../cutroom-studio/SKILL.md).
Studio templates expose editable props and behave as local timed overlays.

## Font selection

The Font picker searches bundled fonts and the Google Fonts catalog. Google
fonts download on first selection and are stored in the project’s `fonts/`
folder for offline preview and export. Use exact catalog family names for text,
cover and caption styles; preserve `Inter Variable`, `DM Sans Variable`,
`Manrope Variable` and `Peacock` for the bundled fonts. Keep `fonts/` with
`project.cutroom` when moving or backing up a project. No Google API key is
needed for the editor’s CSS2 download flow. The picker uses one vertical list,
alphabetical within local and Google groups. Its All, Sans, Serif, Display, Script
and Mono tabs filter together with search; category values follow the catalog.
Use `list_fonts` for the same catalog search and category filtering through MCP,
and `prepare_font` to make a family available offline in a project.

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
Use project IDs established in this chat or its explicitly referenced editor URL;
the server's last active project may belong to another chat. Each MCP opening
gets its own editor instance. Different tabs of the same project still share its
saved file and revision checks; create a copy for independently saved versions.

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
adjusts the selection. Group positioning stays on the timeline; multi-selection
inspectors show shared editing controls without a redundant position field or
paragraphs explaining selection/dragging.
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
  path. Open the returned `editor_url` in a **new browser tab**, using the browser
  creation tool. Preserve its `instance` query parameter. Never navigate or
  replace a tab already editing another project, even if it is focused.
- `create_project` and external edit results also return a new-instance URL.
  Open it in a new tab when presenting the result. Existing project tabs receive
  a project-scoped update notice; they are never automatically reloaded or
  switched. Their recovery drafts and pending caption-job state are scoped to
  the instance. User-initiated project switching inside a tab remains available.
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
  `exports/`, and `fonts/` together. The manifest alone does not include the media.

## Free space from exports

Use `delete_exports` when the user asks to clear exports or free space from
exported files. It covers all recognized project folders inside
`~/Documents/Cut Room` only, even when `CUTROOM_PROJECTS_DIR` points elsewhere;
there is no custom-root argument. It has no editor button and does not open or
change project timelines.

`{"dry_run": true}` previews eligible file counts and bytes without deleting.
When the user explicitly requests cleanup, use `{"dry_run": false}` to delete
eligible exports permanently. Adding or documenting this tool is not a request
to run deletion. Do not invoke it automatically after exports or dubbing.

It preserves project documents, sources, media and sound libraries, thumbnails,
history, nested export folders, links, shared files, and exports referenced as
source media. Active projects are skipped; a running export blocks cleanup.
Report actual `deleted_files`, `freed_bytes` and any skipped items; a preview's
`bytes` is potential space, not space already freed. Do not substitute recursive
shell deletion if the tool refuses or skips files.

## Global setup and current tools

The checkout is `/Users/eli/Documents/Marketing/video resources/cutroom`.
Cutroom's MCP is registered in the global Codex configuration, not per project.
The globally installed `cutroom` and `cutroom-studio` skill directories are
symlinks to this repository's `.agents/skills/` sources, so edits stay synchronized.
Do not create a second installation in whichever project is currently open.

Run `npm run check:global` in the Cutroom checkout to verify registration and both
links; `npm run setup:global` repairs them and backs up previous skill copies.
`npm run check:mcp` starts a fresh connection from outside the checkout and checks
Studio, fonts and effects discovery without editing a project or calling a paid
provider. A rebuild of the editor is separate from MCP tool discovery.

If the current chat's tool catalog is stale, continue through the same MCP with
the fresh-connection bridge. From any working directory, run:

```sh
node "/Users/eli/Documents/Marketing/video resources/cutroom/scripts/call-mcp.mjs" list
node "/Users/eli/Documents/Marketing/video resources/cutroom/scripts/call-mcp.mjs" list_studio < request.json
```

For `list_studio`, `request.json` contains `{}`. For other operations it contains
the exact arguments from the listed tool's input schema. Use a JSON file or stdin,
not interpolated shell arguments. The bridge supports the same revision checks,
provider limits and user-authorization boundaries as native tool calls; it is not
an alternative policy or a reason to repeat uncertain paid jobs. Do not stop an
otherwise possible edit simply because the current chat omits a new tool.

On a fresh installation, follow the checkout README: Node 22.12+, `npm ci`,
`npm run build`, FFmpeg installed or `FFMPEG_PATH` configured, then
`npm run setup:global`. Local editing needs no provider keys. For dubbing, check
`integration_status`; reuse configured `ELEVENLABS_API_KEY` and `SYNC_API_KEY`
without asking again. Only report a missing variable when the tool says so.
