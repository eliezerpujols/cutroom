# Caption display controls — November 4, 2026

- Replaced caption Transition native select with None/Fade/Pop square preview tiles using the existing Effects tile component, extracted into shared EffectTile. Caption previews use fade/scale formulas matching caption behavior. Hover/focus animation and reduced-motion handling are retained.
- Replaced the raw highlight checkbox and expanded color field with a Highlight words settings row: swatch, visibility toggle and color popover. Uses shared StyleSettingsRow and existing fields/focus behavior, including mixed selection support.
- Existing Word/Phrase/Sentence control and caption render/schema behavior are unchanged.
- `npm run build` and `git diff --check` passed (existing bundle-size warning).
- Browser verified Fade selects and undo restores None; highlighting enables and undo restores off; highlight color popover opens. Temporary QA edits undone. Original user project not edited.
- Local dark-theme screenshot `display.png` is ignored by Git. Updated globally linked Cutroom skill guidance.
