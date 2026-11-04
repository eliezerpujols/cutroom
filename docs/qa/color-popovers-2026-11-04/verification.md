# Color and background popovers — November 4, 2026

- Color now groups compact Text color and Background settings rows for authored/cover text and multi-selection. Background color, padding and roundness live in its popover, with visibility on the row.
- Caption Text color uses the same popover row. Caption background is not a supported style property, so none was added.
- Extended shared StyleSettingsRow to support rows without a visibility toggle; Text color remains always visible. Existing outline and shadow row behavior remains unchanged.
- `npm run build` and `git diff --check` passed (existing bundle-size warning).
- Browser verified text color popover, background color/padding/roundness, padding 24 → 32 → undo to 24, background on → undo, multi-selection background controls and caption text color. All temporary QA edits undone; user's project not edited.
- Local screenshot `color-background.png` is ignored by Git. Updated globally linked Cutroom skill guidance.
