# MCP and skill audit — 2026-11-04

Updated MCP onboarding/descriptions to 2.8.1 and synced installed/repository Cutroom
and Cutroom Studio skills. Added effects/typography guidance and explicit capability
limits; preserved the Mobbin-first UI guidance which had been missing in the repo copy.

Fresh MCP SDK stdio client: 36 tools, including list_studio/set_studio_element.
Read-only list_studio against the running backend returned orbit-card, duration 120,
with title/subtitle/tag/background/color/accent/turnSeconds properties. edit_text
schema contains effects; text shadow schema includes independent drop and inner.
The existing Codex tool catalog in this chat has 34 tools and lacks both Studio tools:
reconnecting the MCP is still necessary for that session to discover them.

17 targeted Studio, shadows, text effects and font-picker tests passed. This audit
made no project edits, exports, paid calls or backend restart. Only MCP onboarding
text and skills changed; it did not add missing effect/font-search tools.

Known gaps: no dedicated MCP media/Studio/caption-cue effect setter or font search.
AI background removal/speaker tracking remains research only. UI-only controls
(category tabs, preview tiles, drag handles and activity dots) are documented as such.
