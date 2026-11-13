# Safari preview investigation — 2026-11-13

The reported repeating preview was reproduced in the existing Safari instance of
Reel 14 (project 917849f9-f0f9-4deb-96c9-8129f7a87716, saved revision 18).
Play changed to Pause while the timeline remained at zero and the preview was
black. Playback eventually advanced, but repeated seeks made progress unreliable.

Native media diagnostics reported readyState 4, no MediaError, and buffered data.
The source endpoint returned HTTP 206 with Accept-Ranges, a correct Content-Range,
and the requested 2048 bytes. The source is 1080×1920, 30 fps HEVC (hvc1) with AAC
audio in MOV. This investigation did not establish a missing source or range bug.

Temporary Remotion trace logging showed repeated first-frame buffering cycles and
seeks from approximately 0.36 seconds back to zero. One trace also showed a long
wait for AudioContext output timestamps to advance. These observations locate
the failure in the integrated native-preview playback path; they do not isolate
one confirmed root cause.

The editor audio-context option and a synchronized upgrade from Remotion 4.0.539
to 4.0.543 were tried. Neither established a working playback result. A separate
experiment to omit neutral SVG color filters was started but not conclusively
verified before the user asked about using Chrome. All experiments, temporary
logging, and the in-page diagnostics were removed; original dependency versions
and the original preview implementation were restored and rebuilt.

The user was advised that Chrome is a reasonable temporary workaround. This
project was not tested in Chrome during this investigation. Safari remains
unresolved; do not treat the dependency or filter experiments as a verified fix.

No saved project, source media, timeline, provider job, or export was changed.
Existing unrelated Studio work was preserved. This documentation is published
on a non-deploying codex topic branch. No delivery workflows, deployment config,
or active Git push hooks were found in the Cutroom checkout.

Reference: [Remotion playback troubleshooting](https://www.remotion.dev/docs/player/playback-issues)
describes native buffering and temporary trace logging. The installed 4.0.539
`buffer-until-first-frame` and `use-media-playback` implementations were also
inspected locally.

Restoration checks: `npm run build` passed (existing bundle-size warning),
`npm test` passed all 126 tests, and `git diff --check` passed. Installed Remotion
and Player were confirmed back at 4.0.539. These checks validate restoration, not
successful Safari playback.
