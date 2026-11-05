# GIPHY integration — 2026-11-04

Added the GIPHY toolbar panel with GIFs, Clips and Stickers, 400ms-debounced search,
explicit pagination, square previews, creator/source attribution, official brand
marks, Full frame/Overlay placement and the existing timeline drag protocol.
Structure reference: [Synthesia GIPHY picker](https://mobbin.com/screens/d562c5a7-90a3-438b-9589-dcdd403046a0).
Colors, fields, buttons and typography reuse Cutroom's current controls.

## Verified

- Connected the user-created Web/JS SDK application. The key is in the ignored
  local `.env`; it is not in Git, project files, documentation or MCP output.
- Actual browser requests loaded 20 GIF results. A `confetti` search in Stickers
  loaded 20 image previews, with Overlay selected by default. No server proxy.
- Clips returned an access denial and showed “Clips access is awaiting GIPHY approval.”
- Local GIF import: a generated 2-second transparent animation became 60 RGBA
  frames, added to the timeline, converted to an overlay, resized and dragged on
  the canvas. Its MP4 export and companion cover completed. Inspected frames at
  0.1s and 0.6s: colors changed and the underlying Studio card remained visible
  through transparent pixels. This test used our own generated file, not GIPHY
  content obtained before approval.
- 77 tests passed in the working checkout, including the new GIPHY placement,
  URL validation/attribution, alpha/timing/project-copy and isolated HTTP tests.
  Isolated tests proved the live-style approval guard rejects import before
  file access, approved synthetic fixtures import/add correctly, and stale
  revisions cannot create another clip.
- Fixed thumbnail generation for sub-half-second MP4s found by the HTTP fixture.
- TypeScript/Vite build passed (existing bundle-size warning remains). Global
  links validated; fresh MCP 2.12.0 discovered 49 tools including giphy_status,
  open_giphy, import_giphy and add_giphy_media. Skill validation passed.

## Initial provider gate (superseded below)

GIPHY's documented practices prohibit storing media copies; local project storage,
conversion and export need explicit permission. `GIPHY_PROJECT_MEDIA_APPROVED`
remains false in the real backend. Browsing is live; import/drag-to-timeline is
implemented but disabled for GIPHY content while this permission is pending.
The user approved and sent the SDK agreement themselves. Separately, the user
authorized a request to developers@giphy.com and clips@giphy.com for Clips and
project storage/conversion/export permission; that email was sent successfully.
The thread had no reply at verification time. Having a key is not treated as
approval for these operations.

Private screenshots and rendered frames are ignored by Git. The official GIPHY
attribution assets under `public/giphy/` are explicitly included with their notice.
Unrelated Studio work already present in this checkout is excluded from this change.

## Overlay default follow-up

Removed the library's Add as selector. GIFs, Clips and Stickers now use overlay
placement on click or timeline drop; Full frame remains in the existing Layout
section. The MCP/HTTP insertion defaults to overlay too, while preserving explicit
full-frame requests for API compatibility. Updated the global skill and README.
The four GIPHY tests passed with the default omitted, including HTTP insertion.
Production build and fresh global MCP discovery passed. Browser verification
confirmed the selector is absent and Full frame is still present on the selected
local GIF overlay. Provider-approval requirements remain unchanged.

## Local insertion enabled — explicit user request

Removed the application-managed approval gate from the picker, browser insert
handler, multipart import route and MCP local-file import route. Status now reports
`localImportEnabled: true`; it does not claim provider approval. Clips still
report actual upstream access failures. No provider credentials or agreements
were changed. Fresh MCP 2.12.1 exposes the updated descriptions globally; both
installed skills remain repository symlinks.

Verified in a separate project, GIPHY local playback test
(`f7649fa6-1d6d-435b-b0a5-4a7345f40463`), preserving other edits:

- Clicked the actual Blue Wave GIF by Evan Hilton result. The browser downloaded
  its MP4 directly, imported it locally and placed a centered 45% overlay.
- Used Layout > Full frame to make the wave a background.
- Dragged the actual Happy Rainbow Sticker using its grip onto the video track.
  It became a separate upper overlay starting at frame 15. Its GIF converted to
  12 RGBA frames and retained transparency and source attribution.
- Played the timeline in the editor and inspected the overlay at frame 17.
- Exported the full 194-frame timeline to MP4 and its matching cover. The output
  is 1080 × 1920, 30fps, 6.47 seconds. Decoded frames at 0.6 and 0.8 seconds show
  the changing sticker over the visible wave, confirming animation and alpha.
- Both sources are relative files inside the project's media directory; rendering
  uses those local sources, with no remote GIPHY dependency for export.
- Four focused GIPHY tests and the TypeScript/Vite production build passed.
  Global setup and fresh MCP discovery checks passed. The skill validator passed.

Screenshots and decoded export frames remain ignored local QA artifacts.
