# Automatic captions

Captions transcribe the audible edited timeline with ElevenLabs Scribe v2.
They do not translate it. Reuse the configured `ELEVENLABS_API_KEY`; `Sync` is
not involved. Timing remains 30 fps. Use the existing project unless another is
requested, and preserve its video/audio edit.

Read the current project, then `estimate_captions`. The estimate makes no provider
call or charge. It includes timeline gaps, audible clips, trims, speed, gain,
fades and track mute state. It uses a configurable approximate credits/minute
rate with a 50% plus 100-credit reserve. Generation checks included credits and
stops above the lower of the configured budget and 10,000 credits. Explain a
budget blocker before changing spending limits; no credit purchase is implied.

For an authorized request, `generate_captions` starts one job. Omit language or
use `auto` to detect speech; a specified language is the spoken-language hint,
not a translation target. A stable optional `request_id` UUID makes a retried
start return that saved job. Poll `get_caption_job`; do not regenerate to check
progress. After a lost response, use `list_caption_jobs` first. `submitted=true`
means a failed/interrupted provider request may already have been charged;
never automatically replay it. Raw successful responses stay in the project's
`captions/` folder for recovery.

Once completed, get the latest saved revision and call `apply_captions` with it.
If the audio changed, inspect the mismatch instead of silently applying earlier
timings. Set `allow_timeline_change` only when the user accepts those timings.
Applying the same job twice does not duplicate its layer. The UI instead merges
the completed layer into its live draft, preserving ongoing edits and autosave.

`get_project` includes caption layer IDs and cue IDs. `edit_captions` can change
cue text, absolute start, duration, visibility, or layer-wide style with revision
protection. Words keep their timestamps when their count stays the same; changing
the word count redistributes timing within that cue, so review its sync. Changing
duration rescales word timings. Captions remain independent of video/audio;
later media edits can require caption timing adjustments.

Inter is the default font; DM Sans and Manrope are also bundled. Style controls
include fill, font weight/size, outline color/width, vertical position, spoken-word
highlight, word/phrase/sentence display, and None/Fade/Pop motion. Sentence mode
shows a complete cue, grouped at punctuation or readability limits; phrase mode
shows up to six words. MP4 exports burn in these styles. `export_caption_subtitles`
writes SRT/VTT with the selected grouping and timings inside `exports/`; subtitle
files do not retain the MP4's font, outline, colors or motion.

The editor's Media/Text rail opens **Text → Auto-transcript**. Caption cues appear
on separate timeline rows and in the transcript list. Select a cue to edit its
text or timing; drag it or its edges to move/resize it. The Style button opens
settings inside the left panel, leaving the video visible. Up to four caption
layers are supported. Current box selection groups video/audio clips; caption
cues are selected and moved individually.
