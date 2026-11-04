# Compact Layout controls — November 4, 2026

- Consulted Mobbin: Framer reference https://mobbin.com/screens/437d5030-772d-46b7-8ba3-bfc75064b0c5 shows position and size above visual effects using compact fields. Adapted that hierarchy using Cutroom's existing fields, buttons, focus states and section headings.
- Added shared PositionSizeControls: percentage X/Y fields, width, and accessible horizontal/vertical centering buttons. Uses StyleNumber validation, mixed states and gesture undo checkpoints.
- Authored text Layout is before Timing; cover and multi-text Layout precedes text styling. Caption style Layout is first. Video/image/Studio overlay Layout precedes template/timing controls. Removed old position sliders, nested position disclosure and helper paragraph.
- Retained 0–100% position range, 10–96% text/caption width and 2–200% overlay width; full-frame media retains Make overlay and overlays retain Full frame. No schema/rendering changes.
- `npm run build`, 8 selection/effects regression tests and `git diff --check` passed (existing bundle-size warning).
- Browser verified text Layout is first, X 50 → 35 → center 50 → undo twice restores 50, multi-text Layout, caption maximum 96 and Studio maximum 200. Reload confirmed Studio Layout is before template props. QA changes undone; user's project not edited.
- Local screenshot `layout.png` is ignored by Git. Globally linked skill updated with layout guidance.
