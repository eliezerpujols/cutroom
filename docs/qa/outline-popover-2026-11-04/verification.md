# Outline settings popover — November 4, 2026

- Extracted the existing shadow row/popover into shared StyleSettingsRow. Shadows retain their mutually exclusive popovers, color swatches and mixed-state visibility toggles.
- Shared OutlineControls replaces expanded outline controls for authored text, cover text, text multi-selection and caption styles. Color and numeric width (0–12px, 0.5px steps) are in the popover; visibility remains on the row. Disabled outlines can have their settings edited without enabling them.
- Uses existing Radix popover positioning, collision handling, focus restoration, Escape isolation, fields and undo checkpoints. No project schema or rendering changes.
- `npm run build` and `git diff --check` passed (existing bundle-size warning).
- Browser verified on independent QA project in dark theme: text outline popover, color and width controls, width change 3 → 4 → undo to 3, existing drop shadow settings, and caption outline popover. QA edit was undone; user's project was not edited.
- Screenshot `outline.png` remains local and ignored by Git. Global skill updated through repository link.
