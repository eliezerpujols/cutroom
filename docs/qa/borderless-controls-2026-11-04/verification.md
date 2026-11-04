# Borderless controls — November 4, 2026

- Restored shared section divider and 17px spacing for text inspectors; removed the extra preset margin when presets are the section's only content.
- Fields, font trigger, secondary buttons, playback/aspect controls, text preset tiles and selected text rows use fills without decorative borders. Active presets use the existing accent fill.
- Preserved structural dividers, timeline selection boundaries and keyboard focus. Added the shared focus treatment to textareas.
- `npm run build` passed (existing bundle-size warning); `git diff --check` passed; `npm run check:global` confirmed both skills and MCP use this checkout.
- Browser verified on independent MCP global verification project with two text items selected. Computed styles confirm transparent borders on Font, numeric fields, preset tiles, text rows and Play. First text section has the standard divider, 17px padding and zero extra preset margin.
- Keyboard Tab from Font to Bold retains the 2px green focus outline and 3px offset. No project edits were made.
- Local screenshot: `selection.png` (ignored by Git).
