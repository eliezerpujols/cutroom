# Intermittent preview stalls — 2026-11-10

## Finding

The report concerned playback stopping until pause/play was toggled in Codex.
The MCP launcher processes were idle, no FFmpeg/render process was running, and
the local HTTP server was idle. Five editor views were open. Five established
browser-to-server connections were observed before the repair.

The previous transport left a project EventSource open for every editor reported
as visible. Embedded editor views can retain that visibility state, so the
visibility-only cleanup could still consume the HTTP/1 origin's six channels and
delay native video ranges or first-use sound requests. This is an intermittent
resource-capacity failure; a warmed playback also reached the end before the
repair. No persistent decoder error was demonstrated in this investigation.

## Repair

- Replaced persistent update subscriptions with serialized, uncached revision
  snapshots, checked every two seconds and aborted after five seconds.
- Hidden/disposed instances cancel checks; stale responses are ignored.
- Repeated snapshots of one revision do not redisplay dismissed notices.
- Snapshots retain the originating editor for the saved revision, including
  while an autosave response is in flight. A later out-of-process revision does
  not inherit an earlier save's origin.
- Cached EventSource clients receive one finite SSE snapshot with a five-second
  retry interval. They no longer retain a long-lived response either.
- Kept native video, scheduled sound effects, rendering and saved media intact.
  Native browser timer functions are called through wrappers to preserve the
  receiver requirements of the embedded browser.

## Verification

- `npm test`: 116 passed, zero failures. New coverage includes hidden/disposed
  request races, timeouts, duplicate notices, autosave origin, unrelated project
  responses and twelve concurrent legacy snapshots that all finish.
- `npm run build`: passed, with the existing bundle-size warning.
- `npm run check:global`: passed.
- `npm run check:mcp`: passed from a fresh external launcher; 51 tools discovered.
- `git diff --check`: passed.
- Live revision snapshot: 91 bytes in 2.394 ms. Legacy SSE snapshot: 112 bytes in
  2.662 ms, with the response finished rather than retained.
- Restarted only the local Cutroom HTTP process to load the transport routes.
  No cloud/runtime deployment or provider generation was submitted.
- Final Codex bundle: `index-BIeOxCZj.js`. Playback started at frame 4 with native
  video at 0.171247 s at 18:52:25 UTC, advanced to frame 645 / 21.546057 s at
  18:52:47 UTC, and reached frame 1193 / 39.766666 s at the end. The final run
  produced no new browser warning/error logs.
- Pause/restart on a second playback held frame 775 / 25.833333 s and resumed
  immediately at frame 778 / 26.024898 s. The editor was returned to frame zero,
  still reporting Saved locally, and retained as the deliverable view.
- Reel 7 remained at saved revision 35 during the code repair. This task did not
  edit its montage, captions, source audio, cover or project media.

Unrelated Studio work already present in the checkout was preserved and excluded
from the repair commit. The branch is a non-deploying `codex/` topic branch;
there are no repository delivery workflows or push hooks.

Sources: [Remotion playback guidance](https://www.remotion.dev/docs/player/playback-issues),
[Player buffer state](https://www.remotion.dev/docs/player/buffer-state), and
[MDN's HTTP/1 SSE connection-limit guidance](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).
