# Google Fonts verification — 2026-11-04

- Build succeeds. Existing Vite large-chunk warning remains.
- 43 tests pass, including known-font validation, unsafe source rejection, all
  project text sources, and reopening/moving cached fonts without Internet.
- Browser: opening focuses search; typing filters results; Enter selects; Escape
  restores trigger focus; empty queries show local fonts first; unmatched search
  shows an empty state. Bundled Google family aliases are not duplicated.
- First-time Lora selection showed download progress, changed the preview, saved,
  and survived reload. Playfair Display was also selected with the keyboard.
- MP4 job bc1384a8-24e5-4967-92f1-e6bec3f89abf completed with a matching PNG cover.
  The extracted frame shows Playfair Display rather than a fallback sans serif.
- Read-only font routes accept local Remotion origins on arbitrary loopback ports
  and reject external origins (verified 200 / 403).
- The original user project was not edited by this QA. Its existing tab requires
  refresh to load the new client. Browser control of that user-owned tab was
  unavailable; verification used a separate project and browser tab.

Artifacts: `font-picker.png`, `export-frame.png`.
