# Cutroom

A local video editor with a browser timeline, a Remotion renderer, and an MCP
server for working with an AI assistant. Import existing footage, edit video and
audio, add captions, design a cover, and export the result. Optional integrations
translate/dub speech with ElevenLabs and apply lip sync with Sync.

**Editing and rendering run on your computer.** API keys are optional: you only
need them for transcription, dubbing, or lip sync. Those operations send the
necessary media to the selected provider and can incur provider charges.

## Quick start

### Requirements

- **Node.js 22.12 or later** and npm.
- **FFmpeg** on your PATH, or an absolute executable path in `FFMPEG_PATH`.
- A current desktop browser. macOS includes optional Finder/file-picker launchers;
  the npm server and MCP can also be run from a terminal on other platforms.
- Internet access for installing dependencies, the renderer's first browser
  download, and any optional provider requests.

On macOS, FFmpeg can be installed with `brew install ffmpeg`.

```sh
git clone https://github.com/eliezerpujols/cutroom.git
cd cutroom
npm ci
cp .env.example .env
chmod 600 .env
npm run build
npm start
```

Open **[http://127.0.0.1:4317](http://127.0.0.1:4317)**. Keep the terminal open;
press Control-C to stop the server. No provider keys are required to start editing.

On macOS, you can also double-click **Start Cutroom.command** after installation.
It starts or reuses the background server and opens the editor. Run
`npm run build` again after changing frontend source; the launcher does not
rebuild an existing `dist/` automatically.

## A typical editing session

1. **Create a project.** Use the folder button next to the project name. Each
   project gets its own folder and autosaved timeline.
2. **Import media.** Drop video/audio or PNG, JPEG, and WebP images into the
   editor. Imported files are copied into the project. Click a media tile to
   append it, or drag it onto a timeline track.
3. **Arrange the edit.** Trim clip edges, move clips, split at the playhead, or
   slip trimmed source footage. Overlapping clips get separate matching tracks.
4. **Work on audio.** Adjust volume, mute, speed, and fades. Extract a WAV or
   detach video audio onto its own track. Avoid playing embedded and detached
   copies of the same sound together.
5. **Add captions if needed.** Open **Text → Auto-transcript**, select the spoken
   language, and request captions. This optional step uses ElevenLabs.
6. **Style the result.** Use **Adjust** for edit-wide light/color controls, or
   a selected visual clip's **Adjustments** section for that clip only.
7. **Design a cover.** Click the square **Cover** tile at the timeline's start.
   Pick a frame, add text, change its colors/background/outline, and drag it into
   place. Choose whether captions appear on the cover.
8. **Export.** Choose MP4 for video, or WAV/MP3 for audio. A new MP4 export also
   saves a separate matching `-cover.png` in the same folder. The cover is not
   inserted into the video. A cover-render failure is reported separately while
   preserving the finished MP4. You can export a cover PNG on its own as well.

Exports are saved in the project's `exports/` directory. Download the files from
the export result or open that folder directly.

### Timeline controls

| Action | Control |
| --- | --- |
| Play / pause | Space |
| Move/select | **V**, then drag clips or their edges |
| Split at playhead | **S** or Command/Ctrl+B |
| Slip source content | **Y**, then drag inside a clip with unused source footage |
| Select several clips | Drag across empty timeline space |
| Add/remove from selection | Shift, Command, or Ctrl + click |
| Select all media clips | Command/Ctrl+A while the timeline has focus |
| Move a selection together | Drag any selected clip; spacing stays intact |
| Nudge focused clips | Left/Right arrow; Shift for one second |
| Undo / redo | Command/Ctrl+Z / Shift+Command/Ctrl+Z |
| Delete selected clips | Backspace / Delete |
| Zoom timeline | Command/Ctrl + mouse wheel, or the zoom controls |
| Resize timeline height | Drag its top divider; double-click resets it |

Timing uses **30 fps**. In the inspector, Timing sliders accept precise seconds.
Slipping changes the source window without moving the clip; changing playback
speed changes its duration. Still images begin at five seconds and can be
extended, but have no source slip, playback speed, or embedded audio.

The upper video track appears above lower tracks; overlapping audio tracks mix.
A gap without video renders black. Caption cues have their own tracks and are
edited individually; media box-selection groups video/audio clips. Ripple
editing and clip-to-clip transitions are not implemented.

### Captions, covers, and adjustments

- **Captions:** edit the timestamped transcript and cue timing. Style Inter
  (default), DM Sans, or Manrope; font size/weight, color, outline, word highlight,
  placement, Word/Phrase/Sentence grouping, and None/Fade/Pop motion. MP4 burns in
  the styles; SRT/VTT exports contain text and timing. Opening Text never starts
  a paid transcription. Review caption timing after later audio edits.
- **Covers:** multiple text blocks with Title card, Highlight, or Text only styles;
  bold/italic, fill and text colors, stroke, padding, roundness, and positioning.
  **Cover guides** toggles approximate TikTok/Instagram profile, portrait-feed,
  and square crops. Guides are preview-only and never exported. The PNG keeps
  the project's aspect ratio; the square tile is a shortcut, not a square crop.
- **Adjustments:** named looks with adjustable strength, exposure, brightness,
  contrast, saturation, temperature, and tint. Clip adjustments render before
  edit-wide adjustments. Captions and cover text retain their chosen colors.
- **Appearance:** system theme, Light, or Charcoal. Narrow layouts use panel tabs.

## How it works

```text
Local source files
  → copied into a project folder
  → timeline + asset references saved in project.cutroom
  → React / Remotion preview in the browser
  → local Remotion render + FFmpeg finalization
  → MP4 + cover PNG, audio, or subtitle files in exports/

Optional provider branches:
  audible edited timeline → ElevenLabs Scribe → word-timed caption layer
  source video → ElevenLabs dubbing → optional Sync lip sync → new editable project
```

The React/Vite client talks to an Express server bound to **127.0.0.1:4317**.
FFmpeg reads media metadata, prepares thumbnails/waveforms, extracts and mixes
audio, and finalizes exports. Remotion uses the shared composition for preview,
video rendering, and cover rendering. Its rendering browser downloads on first
use; fonts are bundled with the app.

Edits change the project document rather than the original footage. Rendering
reads an export snapshot, so its companion cover uses the same settings. New
exports minimize optional descriptive and encoder/software metadata; this does
not certify the content's origin or prevent platform AI labels.

### Project folders and multiple instances

The default library is **`~/Documents/Cut Room`**, with one folder per project:

```text
Documents/Cut Room/My-project-<id>/
  project.cutroom    # JSON timeline, styles, metadata, relative media references
  media/            # copied footage, images, and extracted audio
  thumbs/           # generated thumbnails
  exports/          # video, companion covers, audio, and subtitles
  history/          # saved timeline snapshots
  captions/         # optional transcription jobs and responses
  dubbing/          # optional provider job state and results
```

Back up or move the **whole folder**, not only `project.cutroom`. Reopen it using
**Your projects** or the MCP. macOS **Open project…** uses the system file picker;
other platforms can open by name, ID, or absolute path through the MCP. Missing
media is shown with **Locate file** for reconnecting it.

Autosave uses atomic writes and revision checks, with browser recovery drafts.
MCP openings create a new editor-instance URL and never replace another open tab.
Different projects have independent saved files. Two tabs of the **same** project
share its saved document: conflicting saves are rejected rather than silently
overwriting one another. Use **Save a copy** for an independently saved version.

`CUTROOM_PROJECTS_DIR` changes the default library. An explicit MCP
`projects_directory` chooses another location for a new project. Existing
projects keep their own locations. Local `data/` contains the project registry,
server log, and runtime state; it is not part of the repository.

## Optional provider configuration

Edit your local **`.env`** after copying `.env.example`. Supply your own
`ELEVENLABS_API_KEY` for captions/dubbing, and `SYNC_API_KEY` if you want lip sync.
No OpenAI API key is required. Provider account access is checked at runtime;
installing Cutroom does not include a provider subscription or credits.

| Variable | Purpose / default |
| --- | --- |
| `FFMPEG_PATH` | Optional absolute FFmpeg executable; otherwise use PATH. |
| `CUTROOM_PROJECTS_DIR` | Optional project-library override; defaults to `~/Documents/Cut Room`. |
| `ELEVENLABS_API_KEY` | Server-side ElevenLabs credential for Scribe and dubbing. |
| `SYNC_API_KEY` | Server-side Sync credential for optional lip sync. |
| `CUTROOM_MAX_ELEVENLABS_CREDITS` | Per-request ceiling; default **10,000 credits**. |
| `CUTROOM_MAX_SYNC_USD` | Separate lip-sync ceiling; default **US$3**. |
| `CUTROOM_ELEVENLABS_CREDITS_PER_MINUTE` | Local dubbing estimate rate; default **13,500**. |
| `CUTROOM_SCRIBE_CREDITS_PER_MINUTE` | Local transcription estimate rate; default **330**. |

The estimate rates are implementation defaults, **not guaranteed provider prices**.
The workflow adds a reserve and checks account access/balance before submission.
ElevenLabs credits and Sync dollars are different billing units. Review a budget
blocker before changing limits; Cutroom does not buy credits or change plans.

### Dubbing and lip-sync process

1. Provide the source video and target language through the MCP/skill.
2. `integration_status` reports which credentials are configured, without
   returning them. `prepare_dubbing` checks access, estimates cost, and prepares
   a separate output project without starting a paid generation.
3. `start_dubbing` starts/resumes the prepared job. Poll `get_dubbing_job`.
4. The pipeline translates/dubs speech with ElevenLabs, optionally applies Sync
   lip sync, downloads the result, and imports separate editable video/audio.
5. Open the returned project URL in a new tab, review it, then edit/export.

Automatic dubbing preserves the speaker's voice but cannot enforce CEFR B2 or
an exact translated script. The adapted-text path requires the provider access
checked by the integration, currently implemented as an ElevenLabs Enterprise
check. Watermark-free lip sync also requires a supported paid Sync plan. Details
and provider documentation are in the [dubbing workflow](.agents/skills/cutroom/references/dubbing.md).

Saved provider IDs and job state allow interrupted work to resume. Reuse the
existing job; do not submit another paid request just to check progress. Caption
requests similarly use saved request IDs and separate application to the current
project revision. See the [caption workflow](.agents/skills/cutroom/references/captions.md).

## Connect an AI assistant with MCP

Build the app first. For **Codex on macOS**, register the launcher using the
absolute path to your checkout:

```sh
codex mcp add cutroom -- /bin/zsh "/absolute/path/to/cutroom/Cutroom MCP.command"
```

Restart the MCP connection or open a new Codex chat if the tools do not appear.
For another MCP client, configure **stdio** transport with
`npm run mcp --silent` and the checkout as the working directory. The MCP starts
or reuses the local editor server; no separate MCP API key is required.

The bundled **`$cutroom` skill** is in
[`.agents/skills/cutroom`](.agents/skills/cutroom/SKILL.md). To make it available
across Codex projects:

```sh
mkdir -p "$HOME/.codex/skills"
cp -R .agents/skills/cutroom "$HOME/.codex/skills/"
```

Example requests:

- “$cutroom Create a project from `/absolute/path/video.mov`, trim the first
  second, and open it.”
- “$cutroom Translate this video to English with lip sync and open the result.”
- “$cutroom Add English captions with Inter and a black outline.”
- “$cutroom Design a cover with a yellow title background and export the video.”

| Tool family | Tools |
| --- | --- |
| Projects | `list_projects`, `get_project`, `create_project`, `open_project` |
| Media/editing | `import_media`, `edit_project`, `extract_audio` |
| Captions | `estimate_captions`, `generate_captions`, `list_caption_jobs`, `get_caption_job`, `apply_captions`, `edit_captions`, `export_caption_subtitles` |
| Dubbing | `integration_status`, `prepare_dubbing`, `start_dubbing`, `get_dubbing_job`, `list_dubbing_jobs` |
| Visuals | `set_cover`, `set_visual_adjustments` |
| Exports | `export_project`, `export_cover`, `export_status` |

Agents should read real IDs and the current revision before editing, use timing
in frames at 30 fps, preserve the returned `instance`/`view` URL parameters, and
open results in **new tabs**. The skill documents these rules and recovery paths.

## Credentials and repository contents

Real API keys are **not bundled**. `.env.example` contains blank credential
fields and safe configuration defaults. Keep actual values in your ignored local
`.env` or the server environment; never put them in frontend `VITE_*` variables,
project files, screenshots, issues, or commits. `chmod 600 .env` restricts file
access on macOS/Linux. The integrations report configuration booleans, not keys.

Git ignores `.env` variants (except `.env.example`), media, screenshots, project
manifests/folders, runtime data, dependencies, and render output. A fresh clone
contains source, tests, the lockfile, launchers, documentation, and the skill;
it opens without bundled personal projects or media. Ignoring a file does not
remove it from Git history if it was committed earlier.

## Development and updates

```sh
npm ci
npm run dev
```

Development uses **5173** for Vite and **4317** for the API. Production uses
`npm run build` followed by `npm start` and serves everything on **4317**.

```sh
npm run build    # TypeScript check + production client bundle
npm test         # automated tests
```

After pulling updates, run `npm ci` if dependencies changed, rebuild, and restart
any existing Cutroom server to load backend changes. Refresh the editor when you
are ready to load frontend changes. Do not restart during an export or provider
job; wait for it to finish. Remotion packages are pinned to one shared version.

### Troubleshooting

| Problem | Check |
| --- | --- |
| FFmpeg not found | Install FFmpeg or set `FFMPEG_PATH` to its executable. |
| Port 4317 already in use | An existing Cutroom instance may be running; stop/reuse it instead of launching a duplicate. |
| Port 5173 busy in development | Stop the conflicting dev server or use the production build on 4317. |
| MCP tool missing / route unavailable | Reconnect the MCP and restart the updated Cutroom backend. |
| Rendering browser download fails | Check internet access; the first Remotion render needs its browser download. |
| Save conflict | Reopen the saved version or keep an independent project copy; do not overwrite another instance's revision. |
| Missing media | Use Locate file, or restore the project's entire folder from backup. |
| Provider access/budget blocked | Check your local credentials, account capabilities, and separate spending limits; resume the existing job after resolving it. |

## Code map and further reading

| Path | Role |
| --- | --- |
| `src/App.tsx`, `src/Timeline.tsx` | Workspace, timeline interactions, and inspector. |
| `src/remotion/` | Shared media/caption/cover composition for preview and export. |
| `src/CoverEditor.tsx`, `src/CoverGuides.tsx` | Cover authoring and preview-only crop guides. |
| `src/VisualAdjustments.tsx` | Global and per-clip image adjustments. |
| `server/index.ts` | Loopback HTTP API and export queue. |
| `server/projects.ts`, `server/schema.ts` | Portable documents, validation, revision checks, registry. |
| `server/media.ts` | FFmpeg inspection, import, extraction, thumbnails, waveforms. |
| `server/captions.ts`, `server/dubbing*.ts` | Optional provider workflows and saved jobs. |
| `server/mcp.ts` | MCP tools over stdio. |
| `.agents/skills/cutroom/` | Reusable assistant instructions and workflow references. |

Design rationale and implementation limits:
[captions](docs/captions-design.md),
[covers/adjustments](docs/covers-and-adjustments.md),
[cover guides](docs/cover-guides.md),
[timing](docs/timing-controls.md),
[audio controls](docs/audio-controls.md), and
[editor instances](docs/editor-instances.md).

The source includes design-reference links, not reference screenshots or stock
footage. Runtime validation varies by feature; see those notes. Setup commands
are documented here without claiming every operating system/provider path has
been exercised. No new UI tests or paid generations were run for this README update.
