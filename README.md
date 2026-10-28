# Cutroom

A small local video and audio editor built with React and Remotion. Trim, split,
slip, adjust audio independently, and export existing footage without uploading
it to a cloud editor. Includes a local MCP server and a Codex skill.
The MCP can also translate and dub footage with ElevenLabs, apply Sync lip sync,
and open the finished result as an editable local project.

## Install

Requires **Node.js 22.12+** and **FFmpeg**. On macOS, install FFmpeg with
`brew install ffmpeg`, or provide an existing executable through `FFMPEG_PATH`.

```sh
git clone https://github.com/eliezerpujols/cutroom.git
cd cutroom
npm ci
cp .env.example .env
npm run build
```

`FFMPEG_PATH` is optional when `ffmpeg` is on PATH. The `.env` file is loaded by
the npm server/MCP commands and macOS launchers. Local editing requires no API
keys; the optional dubbing workflow uses the provider variables described below.
On first render Remotion downloads its rendering browser.

## Open

Double-click **Start Cutroom.command**, or run:

```sh
npm start
```

Open **http://127.0.0.1:4317**. The server listens on this computer only. Local
editing and export use no external generation credits. A requested MCP dubbing
workflow sends its source to ElevenLabs and, for lip sync, sends video/audio to Sync.

## Projects

The folder button beside the project name opens **Your projects**. Create a new
project, save an independent copy, or reopen a recent project. **Open project…**
opens the macOS file selector: choose the folder's `project.cutroom` file without
typing a path. The selector starts in the project library; canceling leaves the
current edit in place. The native selector currently requires macOS; the MCP can
still open projects by name, ID or absolute path on other platforms.

By default, projects live in **`~/Documents/Cut Room`**, one portable folder per
project. The working directory of the agent or application does not change this
location. Imported media, extracted audio, documents and exports belong with the
project:

```text
~/Documents/Cut Room/
  Reel-2-English-…/
    project.cutroom   # JSON manifest: timeline, metadata, relative media paths
    media/           # copies of video and audio, including extracted WAVs
    thumbs/          # generated thumbnails
    exports/         # MP4 / WAV / MP3 results
    history/         # previous timeline snapshots
```

Move or back up the entire folder together. The manifest alone does not contain
the media. Choose `project.cutroom` inside the moved folder to reopen it;
references remain relative.
If a media file is deleted, the project still opens and shows **Locate file**
in the media panel. Choose its replacement to reconnect the existing edits.
Exports require all media used on the timeline to be available.

Autosave writes atomically with revision checks. The browser keeps a recovery
draft while saving, retries connection failures, and refuses to overwrite a
newer revision saved by another tab or tool. A conflict offers **Reopen** to load
the saved version. The previous draft remains in browser storage until a new
successful save. Before switching projects the editor saves pending changes.
The original single workspace is migrated automatically; its old data files
remain untouched as a backup. Existing projects inside the old checkout's
`projects/` directory are moved automatically into the default library. Explicitly opened projects in other
folders keep their locations. `data/projects.json` records known folders, and the
default library is scanned on startup so projects can be found after reinstalling.

To set a different default library, set `CUTROOM_PROJECTS_DIR` in `.env` to an
absolute path (or `~/…`). For a single new project in another location, the MCP's
`create_project` tool accepts `projects_directory`. Leave it unset unless the user
requests another destination. Continuing an existing project uses its current
folder; it does not create a new project or relocate it.

## Use from Codex (MCP)

Register the local `cutroom` MCP server with the command below, using your
checkout path. Restart Codex or open a new chat if its tools do not appear in an
existing session. The local MCP connection needs no separate API key.

Example requests:

- “Abre el proyecto Reel 2 · English en Cutroom.”
- “Crea un proyecto con este video, recorta el primer segundo y ábrelo aquí.”
- “Haz una copia de Reel 2, baja el audio al 80% y exporta un MP4.”
- “$cutroom Traduce este video al inglés con lip sync y ábrelo cuando termine.”

The MCP exposes project listing, creation, opening, local media import, timeline
edits, audio extraction, export and export status. Reads include clip IDs and the
current revision. Edits require that revision; timing values use frames at 30fps.
Opening or editing a project updates the focused connected editor tab. If no tab
is connected, the tool returns an `editor_url` for the agent to open. The MCP
starts the local app when needed; it never opens an unrelated browser by itself.

Register, or re-register after moving the Cutroom application folder:

```sh
codex mcp add cutroom -- /bin/zsh "/absolute/path/to/cutroom/Cutroom MCP.command"
```

The bundled skill lives at [`.agents/skills/cutroom/SKILL.md`](.agents/skills/cutroom/SKILL.md).
Invoke it as `$cutroom`. It is discoverable when working in this checkout.
To use it from any project, install the `cutroom` folder in `~/.codex/skills/`. It guides project selection,
frame-based edits, revision conflicts, reopening and exports through the MCP.

For another MCP client, launch `npm run mcp --silent` with the checkout as its
working directory; the server uses stdio. For Codex on macOS use the launcher
above so it reliably sets its own working directory.

Manual server: `npm start` (keep its terminal open; stop with Control-C).
The launcher and MCP can also start the server in the background.

## Translation and dubbing through MCP

Configure `ELEVENLABS_API_KEY` and `SYNC_API_KEY` in the ignored local `.env`.
The launcher/server reuse them automatically; keys are never exposed by tools,
included in the frontend, stored in projects or committed. Keep the file private
(`chmod 600 .env`). No separate OpenAI API key is required.

The added tools are `integration_status`, `prepare_dubbing`, `start_dubbing`,
`get_dubbing_job`, and `list_dubbing_jobs`. Preparation checks account limits and
cost without a paid generation. Starting runs the full dub and optional lip sync,
downloads the result, imports video and audio as separate editable clips, and
opens a new project. Jobs survive restarts under each project's `dubbing/` folder;
resume the same IDs to avoid duplicate charges. The original edit is preserved.

The defaults stop before exceeding **10,000 ElevenLabs credits** or the separate
**US$3 Sync** limit per video. Sync is quoted live; ElevenLabs uses a conservative
local credit estimate at 13,500 credits/minute plus a 500-credit reserve. This is
not a guaranteed provider quote. Configure another rate only after verifying the
account's billing basis. Increasing limits requires user approval. The workflow
does not buy credits, change plans, enable overage or silently shorten the video.
Watermark-free output requires a paid ElevenLabs plan and a verified Creator,
Growth, Scale or Enterprise Sync plan.

Automatic mode uses ElevenLabs Dubbing v2 translation and preserves the speaker's
voice. It has no B2/CEFR parameter. For explicit control of adapted text, the
`adapted` mode lets the agent translate timed source segments before dubbing and
requires ElevenLabs Enterprise; unsupported access is blocked before spending.
See [the full workflow](.agents/skills/cutroom/references/dubbing.md) for recovery,
spending limits and current provider documentation. Reconnect the MCP or reopen
the Codex chat after updating to discover its new tools.

## Edit

- Drag a clip's edges to trim; drag its body to move it.
- **Split:** click the button or press **S / ⌘/Ctrl+B** to cut immediately at the
  playhead. It cuts the selected clip; with no selection, it chooses the top video
  there (or audio when no video is present). At a clip edge or gap it is disabled.
  Playback pauses at the cut. Undo restores it in one step.
- **Move (V):** select and drag clips; trimming uses their edge handles.
- Drag the divider above the timeline toolbar up or down to resize the timeline;
  its height is remembered in this browser. Double-click the divider to restore
  automatic sizing. The focused divider also supports Up/Down and Home/End.
- **Command + mouse wheel** (or Ctrl + wheel) zooms the timeline around the cursor
  without zooming the page. Normal wheel scrolling stays available. Zoom buttons
  and the slider keep the center in view; Fit returns to the beginning.
- Drag across empty timeline space to box-select video and audio clips across
  tracks. Drag any selected clip to reposition the selection together, preserving
  spacing and audio sync; one Undo restores the move. Selection scrolls at the
  timeline edges. Shift/Command/Control-click adds or removes clips, and
  Command/Control+A selects all clips when the timeline has focus. Arrow keys
  nudge focused selections by one frame (Shift for one second). Escape clears
  selection; Delete/Backspace removes selected clips. The inspector also offers
  a shared start position. Trimming and slipping use one clip at a time.
- Overlapping video and audio clips get separate visible tracks of the same kind.
  Moving a clip onto an occupied track places it in a free matching track above,
  creating one when needed. Drag vertically to another matching track, or above
  the first matching track to create one. Touching edges stay on the same track.
- **Slip (Y):** drag the content inside a clip while keeping its position and duration.
  The button is available when the selected clip has unused source footage;
  trim first to make room. Fine adjustments also
  offer a Source in field and one-frame buttons.
- Select a clip to adjust position, duration, volume, fades and playback speed.
- **Timing** has Start at and Duration sliders with editable seconds and an
  Ends at readout. Sliders adjust one frame at a time. Moving or extending into
  another clip's space uses a separate matching track, as timeline dragging does.
- Audio clips show fade ramps and an attenuated waveform. Select an audio clip
  and drag its small fade handles, or use the inspector's Fade in / Fade out
  sliders. The compact seconds values remain editable for precise adjustments.
- **Playback & content** includes a speed slider and common speed buttons.
  **Content start** shows the selected source window: drag it to slip the source
  without changing the clip's timeline position or duration. Earlier / Later
  buttons adjust it one source frame at a time. Changing speed changes duration.
- **Extract audio as WAV** creates a downloadable audio file. **Detach to a
  separate track** mutes the embedded sound and adds an independent audio clip.
- Import or drag in local video/audio. Click a media tile to append it, or drag
  it onto the timeline at a specific position. Video is fit inside the selected
  portrait, landscape or square canvas.
- Export the full edit or selected time range as **MP4, WAV or MP3**.
  Video exports use Remotion and H.264 at the project resolution, 30 fps.
- New exports are finalized with minimal optional metadata: inherited descriptive
  tags, software/version comments, and container/stream encoder tags are removed.
  This final pass copies encoded streams without another compression step and
  also applies to newly generated dubbed MP4 deliverables. Source media and
  private project/job history are kept. Codec, duration and other structural
  information remain; this does not certify origin or prevent platform AI labels.
- **Appearance:** System (default), Charcoal or Light. Narrow screens use
  Media / Preview / Clip tabs; the timeline can scroll and zoom.

Timing is frame-based at 30 fps. A gap between video clips exports as black;
audio tracks can continue through it. Trimming or slipping one track does not
silently move another. Multiple audio tracks mix together; avoid leaving the
same sound enabled twice after detaching. The upper video track appears above
lower tracks in the preview and exported video. Clips cannot overlap within
one track; their timing and source windows stay unchanged when assigned to a new
track. There is no ripple editing or transition tool.

## Development

```sh
npm install
npm run dev
```

The development UI runs on port 5173 and proxies the local API on port 4317.

```sh
npm test
npm run build
```

All Remotion packages are pinned to the same version. Remotion downloads its
official rendering browser once. Fonts are bundled locally. FFmpeg uses the
executable on PATH or `FFMPEG_PATH`. An existing sibling
`dubbing-workflow/.venv` installation remains a local compatibility fallback;
it is not required for a fresh checkout. Legacy source paths in `data/library.json` are used once for migration.
New imports are copied directly into their project folder.

## Validation

- Twenty-two tests cover default and explicit project locations, migration, rediscovery,
  persistence, portable copies, missing media, revision conflicts, path checks,
  and timing/audio invariants including split selection, clip-edge handling,
  accelerated splits, source continuity,
  trim bounds, slip bounds, speed changes and audio fade/mute behavior. Video track
  cases cover collision placement, free-track reuse, drag preview cleanup,
  legacy overlap repair, track limits, and render/split ordering.
- The video-track change passed the unit suite and production build. Its live
  dragging and export behavior have not been checked in the browser; the active
  editing session was left untouched for user testing.
- Box selection and group movement were prepared without running tests, builds,
  or browser checks, at the user's request. The active editor was not reloaded.
  The user subsequently authorized compilation/restart, and the updated UI was
  built and served without exercising timeline controls.
- Preview video sequences now premount the next clip and pause the playback clock
  while media buffers. This addresses loading gaps at exact adjoining cuts
  without shifting saved clips. No playback test was performed on the active edit.
- The resizable timeline and modifier-wheel zoom were prepared without exercising
  the controls in the user's editing session. Layout height is a browser preference
  and does not change the project document or edit history.
- The metadata finalization step was prepared without rendering a test export or
  modifying existing media, at the user's request. Its stream-copy arguments
  follow FFmpeg's metadata mapping and muxer options; runtime output remains
  unverified until an actual export is inspected.
- The new dubbing integration was not executed against either provider; no test
  generation or paid request was submitted. Compilation is separate from runtime
  validation of provider access, billing and generated output.
- Browser checks cover playback, trim handles, slip dragging, splitting, undo,
  theme switching, narrow layout and the export/download flow.
- Real Remotion MP4, WAV and MP3 exports were generated and decoded successfully.
- The 50% WAV volume test measured 50.5% initial gain and 3.7% gain in the last
  100 ms of a one-second fade-out. The exported WAV duration was exactly 2 seconds.
- Audio extraction and byte-range media delivery were checked against the reel.
- The project picker was checked for thumbnail display, separate creation/copy
  forms, and reopening a folder with a `~/` path, in light and charcoal themes,
  before the native file selector replaced the path form. The native selector
  change has not been run or tested, to preserve the user's active editing session.
- Project reopening, MCP creation/trim/opening, stale-edit rejection, and a
  one-second MP4 export were verified end to end.
- Light surfaces use pure white and neutral grays; the desktop header is 56px.
- Production build and dependency audit pass.

UI primitives follow shadcn composition patterns with Radix behavior for dialogs,
menus, sliders and tooltips. The custom timeline is necessary because the shadcn
inventory has no frame-based media editing component. Design compliance review:
**4/5**; custom CSS supplies the visual tokens rather than Tailwind utilities.

## Design references

Inspected through the Mobbin connection:

- [VEED: preview and timeline hierarchy](https://mobbin.com/screens/22b074f5-6547-4836-8cf0-39e064764f70)
- [Vimeo: filmstrip timeline and contextual controls](https://mobbin.com/screens/d0fbb38f-14c9-42c6-a8d1-0ab79529856c)
- [VEED: visual project library](https://mobbin.com/screens/f6dcf4e8-1233-4b22-b8a7-5dfc114d1750)
- [v0: project preview and contextual actions (structure only)](https://mobbin.com/screens/ff0d6ceb-2856-42ff-9e7e-086907c33878)

The interface adapts their hierarchy into a smaller editing surface. No reference
screens or stock media are included in the app.

## Repository contents

Source, tests, package lockfile, launchers, MCP server, the Codex skill and
`.env.example` are versioned. Videos, audio, screenshots, project manifests,
project folders, exports, runtime data, dependencies and real `.env` files are
ignored. The app opens an empty project on a fresh checkout; add your own media.
