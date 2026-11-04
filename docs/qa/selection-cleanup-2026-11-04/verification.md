# Compact multi-selection inspector — 2026-11-04

Removed the shared Position together section (Selection start and its drag
explanation), selected-text styling paragraph, text preset helper paragraph,
and multi-media playback helper paragraph. The shared inspector removal covers
video, image/Studio, audio, text, caption and mixed selections. Functional controls,
selection counts, mixed values and timeline drag behavior are preserved.

Production build passed. Browser checks in the isolated MCP QA project verified
2-text selection shows styles immediately and 2-Studio selection shows Adjustments
without group positioning or instructional paragraphs. No timeline edit was made.
Screenshot: text-selection.png (local only). Global skill source updated.
