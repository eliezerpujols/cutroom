# Play after an edit — 2026-11-10

## Report and inspection

The user reports that after a local edit, Play can stop responding until a page
refresh. They explicitly reserved visual verification for themselves. No play,
seek, edit, refresh or screenshot was performed on their editor during this fix.
Read-only browser diagnostics found a native video paused at frame zero with
readyState 1 and no native MediaError. The diagnostic console had no historical
errors available, so the exact triggering edit was not reproduced.

The source media endpoint returned a valid 206 response with Content-Range,
Accept-Ranges and the requested 2048 bytes. This investigation did not find a
missing project source or an HTTP range failure.

## Identified failure path

The installed Remotion 4.0.539 native-video `useBufferUntilFirstFrame` calls
`delayPlayback()` and waits for requestVideoFrameCallback/pause/canplay. It has
no unmount cleanup for that handle. A clip replaced while that callback is
pending can leave the Player buffered indefinitely. Its native waiting-event
handler also blocks unconditionally and awaits a later canplay event, even when
the decoder already reports ready. This is a source-confirmed failure path;
it is not a claim that the user's exact sequence was visually reproduced.

## Repair

- PreviewVideo keeps Html5Video's native frame/audio synchronization and its
  existing Web Audio gain and timeshift tolerance. Export still uses
  OffthreadVideo and the existing renderer settings.
- Native-video preview waits now have one explicit owner. A ready decoded frame
  completes a paused seek without waiting for a presentation callback. Real
  playback starvation waits for future data.
- Source changes, leaving the active clip range, unmount and media errors release
  the owned handle. Repeated waiting signals cannot accumulate handles.
- Both layered and legacy compositions pass the real active timeline range;
  premounted future clips and cover stills cannot block playback.
- Preview uses preload=auto so loading can finish while paused. No Player
  remount, page refresh, dropped edit or project-file rewrite is used as recovery.

## Verification and limits

- `npm test`: 122 passed, zero failures, including six native-buffer regression
  cases (edit/unmount cleanup, paused seek with no presentation callback, late
  waiting on ready media, genuine starvation, source/error/Strict Mode cleanup,
  and premount/cover boundaries).
- `npm run build`: TypeScript and Vite passed. Existing large-chunk warning only.
- React checklist: module-level component, complete primitive effect
  dependencies, no effect on project object/style changes, no stateful work in
  render, idempotent event/handle cleanup, no private Remotion APIs.
- `git diff --check`: passed. No browser playback test was run, per request.
- Served client bundle: `index-BDA8uQQe.js`; local HTTP process did not need a
  restart because this is a client-only change. An already-open tab must load the
  new client once; future local edits use the repaired lifecycle.
- Existing unrelated Studio work was preserved and excluded from this commit.
  No delivery workflows, configured Git hooks or cloud deployment configuration
  were found in this local-editor repository. Push remains on the existing
  non-deploying `codex/preview-native-audio-sync` topic branch.

Sources: [Remotion buffer cleanup requirements](https://www.remotion.dev/docs/use-buffer-state),
[native video buffering](https://www.remotion.dev/docs/html5-video), and the
installed version's `buffer-until-first-frame.ts` / `use-media-buffering.ts` code.

## Superseded after user-reported regression

The user then reported that overlays advanced while the native video and audio
were absent. The 122 controller/model tests above did not verify the integrated
Remotion media pipeline, and the previous completion statement was too strong.
The custom buffer replacement from 03a1226 is withdrawn in full. Its new
PreviewVideo/nativeVideoBuffer modules and tests are removed; Composition,
LayeredComposition, MediaClip and TransitionMedia return exactly to their
862c649 versions. Remotion again owns native video buffering, frame presentation,
Web Audio gain and scheduled sound effects. Historical evidence above is retained,
but is not proof that the user's reproduction was fixed.

### Replacement correction

Source inspection found both custom playback controls discarded their interaction
events: the button called toggle() without its click and the global Space handler
called toggle() without its key event. Remotion's documented Safari path expects
that event, and its implementation uses it to prime shared audio tags. The button
now invokes the transport in onClickCapture and passes the original event; Space
forwards the actual key event synchronously, with repeat presses ignored.

The existing deferred seek also could run after a subsequent Play. A small
previewTransport controller retains scrubbing coalescing, but flushes the latest
seek synchronously before toggle within the same interaction. It cancels stale
animation-frame callbacks on Play and unmount. It never replaces the Player,
decoder or audio context, and never starts playback from a timer.

### Replacement validation

- `npm test`: 121 passed, zero failures: 116 existing tests plus five transport
  cases covering original event identity/synchronous dispatch, seek-then-immediate
  Play ordering, stale cancelled callbacks, ordinary coalesced scrubbing, native
  keyboard gestures and cleanup.
- `npm run build`: passed TypeScript and Vite; existing large-chunk warning only.
- Local HTTP serves `index-BigfKiDO.js`, containing the restored native pipeline
  and revised gesture/seek transport. No server restart or cloud deployment.
- No playback, project edit, seek, refresh or screenshot was performed in the
  user's browser; they explicitly retained visual verification. Therefore an
  integrated Safari playback result is still unverified.
- The task did not mutate the saved montage or any media files. Unrelated Studio
  work remains outside the commit. Existing non-deploying codex topic branch,
  no delivery workflows or active Git push hooks.

References: [Player best practices — pass interaction events](https://www.remotion.dev/docs/player/best-practices),
[Safari autoplay — prefer click capture](https://www.remotion.dev/docs/player/autoplay).
