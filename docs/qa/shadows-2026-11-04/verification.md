# Compact combined shadows — 2026-11-04

The shared ShadowControls now uses two 32px rows and a 248px floating settings panel. Drop and inner shadows can coexist; each has independent visibility, color, opacity, blur and X/Y offset. No expanded settings remain in the main panel. The popover anchors to the entire row, leaving its visibility control unobscured, and Escape closes only that popover and returns focus.

References: [Figma effect control reference in Mobbin](https://mobbin.com/screens/9936df9d-9fba-441c-87e9-7d20707e4e51) and [Figma effect documentation](https://help.figma.com/hc/en-us/articles/360041488473-Apply-effects-to-layers). Existing Cutroom FontPicker supplies the Radix popover pattern; StyleNumber, StyleColor, Button and IconButton are reused.

Validation:
- `npm run build`: passed; existing large-bundle warning remains.
- `npm test`: 57 passing. Added legacy compatibility, independent enable/disable, deep merging and inherited cue overrides, partial batch editing, invalid-value rejection, schema persistence and SVG compositing checks.
- Browser: enabled inner shadow on a saved legacy drop shadow; changed its opacity, blur and signed offsets; reloaded and confirmed persistence. Hiding/re-enabling inner retained its settings and drop remained unchanged. Escape preserved caption style selection and restored focus to its trigger.
- Three-second MP4 export and companion cover succeeded: job `bcb56a51-5a2b-4e03-912c-5b2e43499346`. Inspected a video frame showing the green drop shadow below the dark inner edge (`export-detail.png`). The default cover intentionally excludes captions.
- QA project: `f93c5670-0f76-4e2f-9707-6295794a492e`. User project was not modified for testing.
- Final editor screenshot: `editor.png`.
