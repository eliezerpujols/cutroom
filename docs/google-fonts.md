# Fonts in Cutroom

The shared font picker is used by cover text, timed text, caption layers and mixed
text/caption selections. Opening it focuses search; Arrow keys choose a result,
Enter applies it, Escape closes it and returns focus. Local/bundled families come
first, followed by Google Fonts, with each group sorted A–Z in a single vertical list.
The fixed tab row filters All, Sans Serif, Serif, Display, Handwriting (Script),
and Monospace (Mono), using the catalog category for both cached and online
families. Search combines with the active category. Opening the picker resets
to All; changing tabs returns results to the top. Tabs support arrow keys and
Home/End, and Arrow Down returns focus to search. A download icon identifies
fonts that have not been cached. Errors appear in the picker and preserve the
current font. Changing the selected timeline item cancels a pending selection.

The catalog contains 1,959 open-source Google font families (snapshot 2026-11-04).
Run `node scripts/update-font-catalog.mjs` to refresh `src/google-fonts.json`.
This build-time snapshot comes from Google's public website metadata endpoint;
it is not a documented API contract. Keeping it checked in prevents availability
or format changes from breaking search. Google's documented Developer API needs
an API key; the documented CSS2 API used for font downloads does not. No key or
Google account is required by this feature.

Selected families are requested from https://fonts.googleapis.com/css2 with their
available normal/italic weights. Cutroom accepts font binaries only from HTTPS
fonts.gstatic.com, bounds downloads and validates names against the catalog.
It caches files in `data/fonts/`, then copies them to the project's `fonts/`
folder. Project copies include that folder. Keep `fonts/` with `project.cutroom`
when moving a project. Existing bundled Inter, DM Sans, Manrope and Peacock remain
available without downloads. A new Google font requires an Internet connection
once; after selection its project copy supports offline preview and export.

The composition loads local files through FontFace and blocks Remotion export
until they are ready. Missing/download failures fail an export rather than silently
substituting a font. Available weights are used; families without italic retain
the editor's existing synthesized-italic behavior. Cover companion renders use
the same project font source. No authored text is sent to Google.

Design reference: https://mobbin.com/screens/f153a954-c9fa-4c7d-856e-815f39792b51
Google API: https://developers.google.com/fonts/docs/css2
Catalog API comparison: https://developers.google.com/fonts/docs/developer_api
