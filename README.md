# Cutroom

A small local video and audio editor built with React and Remotion. Trim, split,
slip, adjust audio independently, and export existing footage without uploading
it to a cloud editor. Includes a local MCP server and a Codex skill.

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
the npm server/MCP commands and macOS launchers. No API keys are required.
On first render Remotion downloads its rendering browser.

## Open

Double-click **Start Cutroom.command**, or run:

```sh
npm start
```

Open **http://127.0.0.1:4317**. The server listens on this computer only. The app
does not call ElevenLabs or Sync, and does not use their keys or credits.

## Projects

The folder button beside the project name opens **Your projects**. Create a new
project, save an independent copy, or reopen a recent project. **Open from a
folder** accepts an absolute folder path or `project.cutroom` path.

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
the media. Open a moved folder from its new path; references remain relative.
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
existing session. No API key is needed.

Example requests:

- “Abre el proyecto Reel 2 · English en Cutroom.”
- “Crea un proyecto con este video, recorta el primer segundo y ábrelo aquí.”
- “Haz una copia de Reel 2, baja el audio al 80% y exporta un MP4.”

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

## Edit

- Drag a clip's edges to trim; drag its body to move it.
- **Split:** click the button or press **S / ⌘/Ctrl+B** to cut immediately at the
  playhead. It cuts the selected clip; with no selection, it chooses the top video
  there (or audio when no video is present). At a clip edge or gap it is disabled.
  Playback pauses at the cut. Undo restores it in one step.
- **Move (V):** select and drag clips; trimming uses their edge handles.
- **Slip (Y):** drag the content inside a clip while keeping its position and duration.
  The button is available when the selected clip has unused source footage;
  trim first to make room. Fine adjustments also
  offer a Source in field and one-frame buttons.
- Select a clip to adjust position, duration, volume, fades and playback speed.
- **Extract audio as WAV** creates a downloadable audio file. **Detach to a
  separate track** mutes the embedded sound and adds an independent audio clip.
- Import or drag in local video/audio. Click a media tile to append it, or drag
  it onto the timeline at a specific position. Video is fit inside the selected
  portrait, landscape or square canvas.
- Export the full edit or selected time range as **MP4, WAV or MP3**.
  Video exports use Remotion and H.264 at the project resolution, 30 fps.
- **Appearance:** System (default), Charcoal or Light. Narrow screens use
  Media / Preview / Clip tabs; the timeline can scroll and zoom.

Timing is frame-based at 30 fps. A gap between video clips exports as black;
audio tracks can continue through it. Trimming or slipping one track does not
silently move another. Multiple audio tracks mix together; avoid leaving the
same sound enabled twice after detaching. Overlapping video clips show the
later clip in the project order. There is no ripple editing or transition tool.

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

- Fifteen tests cover default and explicit project locations, migration, rediscovery,
  persistence, portable copies, missing media, revision conflicts, path checks,
  and timing/audio invariants including split selection, clip-edge handling,
  accelerated splits, source continuity,
  trim bounds, slip bounds, speed changes and audio fade/mute behavior.
- Browser checks cover playback, trim handles, slip dragging, splitting, undo,
  theme switching, narrow layout and the export/download flow.
- Real Remotion MP4, WAV and MP3 exports were generated and decoded successfully.
- The 50% WAV volume test measured 50.5% initial gain and 3.7% gain in the last
  100 ms of a one-second fade-out. The exported WAV duration was exactly 2 seconds.
- Audio extraction and byte-range media delivery were checked against the reel.
- The project picker was checked for thumbnail display, separate creation/copy
  forms, and reopening a folder with a `~/` path, in light and charcoal themes.
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
