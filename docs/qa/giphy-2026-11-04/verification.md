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

## Provider dependency

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
