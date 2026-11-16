# Paper conversation stack — 2026-11-16

Added the independent `paper-chat-stack` Studio template for loose, editable conversation cutouts. Existing conversation and phone templates keep their behavior. It shares the existing conversation cues and PDF card, with a separate paper silhouette renderer and deterministic source-local pose calculation.

Messages enter from their sender's lower corner in four held repositionings, with no tweening or fade. At the default 12-frame entrance each pose lasts three frames. The static uneven scissor-cut silhouette includes its lower tail, mirrored only on the paper layers for incoming messages. Text stays upright. Paper texture uses a fixed SVG noise seed.

Local Reel 14 verification:

- Replaced the reply and four split follow-up phone clips in place, retaining clip IDs, timeline spans and tracks. Follow-up source windows now progress continuously, with sends and PDF receipt aligned to the existing cut/foley beats.
- Used existing blue background assets in those two scenes. Native message copy remains editable.
- Before/after comparison: exactly seven affected clips; all other clips, narration, text, captions and independent cover unchanged. Project saved at revision 108 after a temporary UI timing edit and Undo check.
- Inspected full-size production-composition frames during entry, after replies, and after PDF arrival; checked both tail directions, readability and text clearance.
- Reopened the saved editor, verified overlay position/size and editable timing, changed the timing and restored it with Undo. Refreshed after the final client build and inspected the revised paper contour in the editor.
- Rendered a short local MP4 through the production composition. Review files and project snapshots remain inside the local project folder; no private media is committed.

Validation: `npm test` (138 tests), `npm run build`, `npm run check:global`, `npm run check:mcp`; fresh MCP discovery includes the new template. Build retains the existing large-chunk advisory.

Source delivery uses the `reel-14-paper-chat-bubbles` topic branch. Remote Actions workflows and repository webhooks were both empty when checked. No runtime deployment was requested or performed. Pre-existing edits to ChatBubbles, PhoneChat and their conversation test remain outside this change.
