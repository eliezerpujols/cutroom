# Preview playback — 2026-11-09

## Reproduction and findings

- Report: opening the English edit was slow; preview repeated the initial word.
- Local document, JavaScript and workspace requests completed in about 2–20 ms.
- Old review tabs retained persistent HTTP/1 SSE connections. After saved
  duplicates were closed, the previously blocked Codex tab loaded and exposed
  fully buffered audio/video (`readyState=4`). Tabs without a confirmed saved
  state were preserved.
- Safari reported that the English RAW MP4 could not be decoded by the
  WebCodecs path and used native fallback. Its configured 1/30-second seek
  tolerance was below native audio output latency.

## Repair

- Hidden editor tabs release their event stream. Reconnection reconciles missed
  saved revisions, retaining the existing update notice and recovery drafts.
- Revision comparison reads the latest autosaved revision, not just the revision
  at initial page load.
- Video preview uses native `Html5Video`, Web Audio and Remotion's default
  latency-aware seek tolerance. Server export keeps `OffthreadVideo`.
- Sound effects retain scheduled `@remotion/media` audio. An intermediate native
  effects implementation failed at 23.39 s because of the five shared native
  audio-tag limit; that intermediate implementation was removed.
- Temporary diagnostic UI was removed before the final build.

## Verification

- `npm run build`: passed (existing bundle-size warning).
- `npm test`: 114 passed, zero failures.
- `npm run check:global`: passed.
- `git diff --check`: passed.
- Final Codex playback started at 00:00.20 with decoded video at 0.278639 s,
  passed the previous failure at 00:23.43 (video 23.583855 s), and reached
  00:34.29 / 00:34.33 (video 34.309236 s, paused at the end).
- Browser error log: no new errors during the final playback.
- The editor was returned to 00:00.00 and retained as the deliverable tab.
- English project revision remained 11; this task changed preview code, not the
  user's saved video, narration, cover or scene timings. No provider generation
  or export was submitted.

The local screenshot `codex-playback-end.jpg` beside this report shows completed
Codex playback. It follows the repository's ignored-media policy and is not
included in the source commit.

## Source references

- [Remotion native video](https://www.remotion.dev/docs/html5-video)
- [Remotion playback troubleshooting](https://www.remotion.dev/docs/player/playback-issues)
- [MDN: SSE connection limit across tabs](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
