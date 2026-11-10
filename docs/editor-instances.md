# Editor instance isolation

The old server sent `open-project` to the last focused SSE client. Its browser
handler saved the current editor and loaded the incoming project. Another chat's
open, edit or dubbing completion could therefore replace the visible session even
though project files were separate.

MCP open/create/edit results now return `editor_url`, `editor_instance_id`,
`open_in_new_tab=true` and `next_action=open_editor_in_new_tab`. URLs include both
an explicit project ID and a unique instance ID. The agent must create a new tab;
the HTTP server does not control Codex's browser. Existing cached MCP clients
still receive the destination metadata from the server. Their old `broadcast`
flag is accepted for compatibility but cannot trigger navigation.

Editors check a small project-scoped revision snapshot every two seconds while
visible. External updates become `project-changed` notices; there is no focused
client fallback. The snapshot retains the originating instance for the current
revision, so an autosave whose response is still in flight cannot notify itself.
Old unscoped tabs receive no navigation events. Dubbing completion returns a
separate output-instance URL instead of navigating a connected tab.

The shell defensively ignores navigation events and mismatched project IDs. A
notice offers the saved update in another tab, without saving, replacing or
reloading the current edit. Normal user-initiated switching through Your projects
still saves and loads within that tab.

Recovery drafts and pending caption-job pointers use project-plus-instance keys.
An old tab whose URL has no instance parameter can migrate its legacy state once
on reload. A new MCP instance cannot adopt another tab's legacy draft. Same-file
instances keep revision conflict checks; this is view isolation, not an automatic
project fork. Save a copy creates an independently saved version.

## Bounded update connections (2026-11-10)

The visibility-only SSE repair did not cover embedded browsers that report
several open editor views as visible. Persistent streams could still occupy the
HTTP/1 connection pool shared with video, sound effects and newly opened editors.

`subscribeProjectUpdates` now uses finite, uncached revision requests. Each editor
has at most one request in flight, aborts after five seconds, and waits two
seconds before checking again. Hidden views cancel their request and timer;
returning checks immediately. Old responses after hiding or disposal are ignored.
Unchanged revisions do not repeat a dismissed notice.

`GET /api/projects/:id/revision` returns only the current revision and its known
origin, without media metadata or filesystem checks for every asset. Cached older
clients retain `/api/events` compatibility: it returns one SSE-formatted snapshot
and ends, with a five-second reconnect interval. No update request reserves a
persistent connection. Out-of-process file changes do not inherit stale origin
information from an earlier save.

Revision conflict checks, recovery drafts and the existing update notice remain
unchanged. Checks never reload or overwrite the current edit. See the
[dated verification](qa/preview-playback-2026-11-10/verification.md) and the
[previous native-audio repair](qa/preview-playback-2026-11-09/verification.md).
