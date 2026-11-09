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

SSE clients register their project and instance. External updates are delivered
only to matching project IDs as `project-changed` notices. There is no focused
client fallback. Autosave identifies its originating instance so it does not
notify itself. Old unscoped tabs receive no navigation events. Dubbing completion
returns a separate output-instance URL instead of navigating a connected tab.

The shell defensively ignores navigation events and mismatched project IDs. A
notice offers the saved update in another tab, without saving, replacing or
reloading the current edit. Normal user-initiated switching through Your projects
still saves and loads within that tab.

Recovery drafts and pending caption-job pointers use project-plus-instance keys.
An old tab whose URL has no instance parameter can migrate its legacy state once
on reload. A new MCP instance cannot adopt another tab's legacy draft. Same-file
instances keep revision conflict checks; this is view isolation, not an automatic
project fork. Save a copy creates an independently saved version.

## Background connections (2026-11-09)

Only visible editors hold an SSE connection. Background instances release theirs
so they cannot exhaust HTTP/1's shared origin connection pool and stall media,
font loads or a newly opened editor. Returning to a tab reconnects and checks the
saved workspace for missed revisions. The check uses the editor's latest saved
revision so its own autosaves do not create a false external-update notice.
Drafts remain untouched; a missed external change still produces the existing
notice rather than reloading the editor.

The 2026-11-09 repair preserves user project data and recovery drafts. Visibility
subscription tests cover disconnect, reconnect and stale events; the current
English project was played through in Codex without editing its montage or
calling a paid provider. See the
[dated verification](qa/preview-playback-2026-11-09/verification.md).
