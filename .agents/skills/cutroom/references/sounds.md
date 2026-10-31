# Sound effects

The Sounds library is shared across projects at `~/Documents/Cut Room/Sound Library`
(under `CUTROOM_PROJECTS_DIR` when configured). Audio files and the local catalog
are not bundled in the repository. Project placement copies a sound into that
project's media folder, so its export does not depend on the shared library.

- `list_sounds`: search names with `query`, optionally filter by `category`.
  Returns IDs, durations, categories, source links, waveforms and local preview
  URLs. Returns up to 200 matches; narrow the search for larger libraries.
- `import_sounds`: import up to 100 absolute audio file paths with an optional
  category. Files are copied and deduplicated by SHA-256. Each file has its own
  success, duplicate or error result. This does not change the timeline.
- `add_sound`: use a returned `sound_id`, project ID, current
  `expected_revision`, `start` in 30 fps frames, and optional `volume` (0–2).
  Creates an editable audio clip; overlaps receive separate audio tracks.
  Open its returned editor URL in a new tab without replacing an existing tab.

The UI's Sounds tab supports search, categories, a preview button for each named
sound, and drag-and-drop onto the timeline. Dropping on a video row still creates
an audio clip. The drop marker snaps to clip edges when snapping is enabled.
The plus button adds the sound at the playhead as a keyboard-accessible alternative.
File/folder import is available in the panel's plus menu; a folder is uploaded in
batches of 20 audio files. MP3/WAV/OGG/OPUS/M4A/AAC/FLAC are accepted, up to 25 MB
and two minutes per file. Browser preview codec support varies by format.

For a specifically authorized SoundButtonsWorld download batch, the checkout has
`scripts/import-soundbuttonsworld.ts`. Run with an explicit `--limit` (1–200).
It reads public page state and public MP3 downloads, retains names/categories and
source links, paces requests, and writes a local import report. Existing content
is deduplicated. It stops on 401/403/429 without retrying access restrictions;
report partial completion rather than claiming the requested count was reached.
Do not expand a requested batch into a whole-site crawl or distribute its audio
with the code. Local editing and importing do not use provider credits.
