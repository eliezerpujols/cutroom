# Inspector section hierarchy — November 4, 2026

- Added InspectorSection, reusing the established inspector-section and section-title structure. It provides a named section and h3 heading; no interaction behavior changes.
- Authored text and cover controls now separate Text, Font, Color, Background, Outline and Shadows. Caption style separates Font, Color, Outline, Shadows, Display and Position & size. Existing Timing remains a peer section.
- Section headings and collapsible property headings use 11px type, 550 weight and 18px line height. Divided groups use 17px vertical padding; field labels remain 10px regular. Shared property groups use 14px gaps.
- FontPicker supports hideLabel for use under a Font heading, preserving its accessible Font/value label. Existing standalone uses retain the visible label.
- Moved inspector stylesheet after the base styles so the shared hierarchy consistently applies across text, captions, media and Studio.
- `npm run build` and `git diff --check` passed (existing bundle-size warning).
- Browser checked on separate MCP global verification project. Text headings (Timing through Position & size), all caption style headings, and Studio headings (Orbit card, Overlay, Timing, Adjustments) resolve to the same typography. Inspected section separation in screenshots. No saved project edits.
- Screenshots `text-color.png` and `caption-sections.png` remain local and ignored by Git.
