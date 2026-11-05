# GIPHY in Cutroom

The GIPHY toolbar panel has GIFs, Clips and Stickers tabs, exact-query search,
pagination, animated previews, creator/source links and official Powered by GIPHY
branding. All content inserts as overlays by default, by click or timeline drag.
Use Layout > Full frame on the inserted clip to fill the canvas. Do not add a
placement selector to the library panel. Imports use the
same timeline drag target and grip pattern as Media and Sounds. Selecting an
item adds it at the playhead; dragging sets its timeline start and target lane.
Overlays retain preview movement, resize, rotation, crop and mirror controls.

## Connection and access

`GIPHY_API_KEY` is a browser SDK key stored in the ignored local `.env`. The
local config endpoint supplies it to the browser; status/MCP output never includes
it. Use the existing configured key. Having a logged-in GIPHY account is separate
from having an application key. Accepting a new SDK agreement is a user action.

GIPHY beta keys are documented as limited to 100 API calls/hour. Debounce search,
paginate explicitly, and report 429 errors without an automatic retry loop.
Queries and preview loads go directly from the browser to GIPHY, never through
Cutroom's server. Keep signed URLs/query parameters intact. Do not persist search
results or combine/reorder GIPHY results with other providers. The official JS
SDK's own short-lived memory handling is separate from a project media cache.

Clips access may return 401/403 until GIPHY approves the application. Ordinary
GIF access does not establish Clips access. The panel displays the actual denial.

The user has explicitly requested local import and export. Cutroom does not
require an application-managed approval flag: `giphy_status` reports
`localImportEnabled`, not a claim of provider permission. Do not reinstate the old
`GIPHY_PROJECT_MEDIA_APPROVED` gate or misrepresent local enablement as GIPHY
approval. The browser downloads only a selected item directly from its returned
URL, then imports it into the local project. That source is retained with the
project for reliable reopening and offline export. Search and new downloads
require internet; editing and export run locally. Preserve real API failures,
including restricted Clips access.

## MCP 2.12.1

- `giphy_status`: redacted key/configuration and local import capability.
- `open_giphy`: returns a new editor instance for the requested project with
  `view=giphy`. Open that URL in a new tab; preserve other editor tabs.
- `import_giphy`: accepts an absolute path to media already downloaded directly
  by the browser, plus `source` attribution. Processing runs locally.
  Never add a server-side GIPHY search/download proxy to make this tool work.
- `add_giphy_media`: inserts an imported `asset_id` as `clip` or `overlay`, with
  `start` in frames, optional `track_id`, and the current `expected_revision`.
  Omitted `placement` defaults to `overlay`.

The browser panel downloads only the selected rendition (up to 50MB),
then uploads it to the local editor. Sticker GIFs keep alpha; Clips use their
video rendition with sound. The source record includes provider, ID, type,
original GIPHY page and available creator attribution. Keep this metadata.

## Animation and offline media

Ordinary local GIF import also works through Media, without a GIPHY account or
provider approval when the user supplies their own file. GIFs up to two minutes
convert locally into a 30fps RGBA PNG sequence plus a WebM library preview.
Preview/export use the sequence for deterministic animation and transparency.
Keep the full `media/` directory with `project.cutroom`; project copies include
all frames. Animated images are timed video assets, not static `<img>` layers.

Sources: [API practices](https://developers.giphy.com/docs/api/),
[Clips access](https://developers.giphy.com/docs/clips/endpoint/),
[SDK agreement](https://support.giphy.com/hc/en-us/articles/360027858552-Giphy-SDK-License-Agreement).
