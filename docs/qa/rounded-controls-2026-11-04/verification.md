# Rounded filled controls — November 4, 2026

- Shared button radius increased from 8px to 10px; added a 10px control radius token for fields and filled rows/tiles.
- Search, dropdowns, textareas, numeric fields, text presets, library selection rows, font options and segmented control containers use the shared radius.
- `npm run build` and `git diff --check` passed (existing bundle-size warning).
- Browser verified Search media, Media type, Start at and Duration compute to 10px. Screenshot confirms media search/dropdown and Studio fields. Used independent QA project without saved edits.
- `controls.png` is local and ignored by Git. Updated the globally linked Cutroom skill with the shared radius rule.
