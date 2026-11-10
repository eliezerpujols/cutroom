# Overlapping audio preview

Voice and sound-effect clips use `Audio` from `@remotion/media` in the browser,
pinned to the same version as the other Remotion packages. It decodes and schedules
audio against the shared Web Audio timeline instead of starting a separate HTML
media clock for each clip. This avoids repeated HTML audio `waiting` events
pausing the Player and forcing the video to seek when an effect starts.

Audio sequences premount two seconds ahead with an absolute-fill wrapper (a
`layout="none"` Sequence cannot premount). Premounting prepares the source window
without playing early. The wrapper has no pointer events. Audio that needs the
HTML fallback does not block the global preview while loading; it follows the
Player frame when ready. Video buffering remains enabled.

Trim offsets, speed with preserved pitch, track and clip muting, volume, and fades
are passed through. Server rendering retains `Html5Audio`; this change does not
alter the export mixer or saved project data.

## Native video compatibility (2026-11-09)

Video preview uses `Html5Video` with buffering and Web Audio enabled, while export
continues to use `OffthreadVideo`. This avoids the failing WebCodecs decoder path
observed on the English RAW MP4. Remotion's latency-aware seek tolerance is kept;
the old explicit 1/30-second tolerance could repeatedly seek native fallback
audio on Safari. Scheduled sound effects retain their existing preview path,
avoiding the shared native-audio-tag limit during premounting.

Project update checks now use finite revision requests, including compatibility
responses for cached SSE clients, as described in
[editor instances](editor-instances.md). This leaves the browser's shared HTTP/1
connections available for media even when an embedded browser reports several
editor views as visible. The native video and scheduled-audio paths stay intact.

References: [Remotion Audio](https://www.remotion.dev/docs/media/audio),
[Player buffering](https://www.remotion.dev/docs/player/buffer-state).

Validation: TypeScript, production build, 114 automated tests and a complete
34-second playback of the English project in Codex. See the
[dated verification](qa/preview-playback-2026-11-09/verification.md). The saved
montage and export mixer were not changed by this preview repair.
