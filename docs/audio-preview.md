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

References: [Remotion Audio](https://www.remotion.dev/docs/media/audio),
[Player buffering](https://www.remotion.dev/docs/player/buffer-state).

Validation: TypeScript and the production build only. Live playback and exports
have not been exercised, following the user's instruction to leave their active
editing session untouched. The reported overlap scenario still needs the user's
playback check.
