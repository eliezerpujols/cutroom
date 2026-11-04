# Global MCP / skills synchronization — 2026-11-04

MCP 2.9.0 exposes 40 tools. Added list_effects, set_effects, list_fonts and
prepare_font. Effects use explicit clip/text/caption cue IDs, partial patches,
independent motion phases and atomic expected-revision saves. Invalid targets
fail the complete request. No paid providers are involved.

Global Codex registration was verified from /tmp, pointing to this checkout's
absolute launcher with all tools enabled. Both global skills now symlink to the
repository sources; previous copies were backed up outside skill discovery.
setup:global is repeatable and check:global verifies links and registration.
call-mcp.mjs provides a fresh stdio connection when an existing chat has an old
catalog. Native app automation could not refresh this chat's app connection, so
no app restart or process termination was attempted.

Verification:
- 63 tests passed; TypeScript and production build passed (existing chunk warning).
- Both skill validators passed.
- Fresh MCP launched from outside the repository: all 40 tools discovered.
- Read-only Studio, caption effect catalog and filtered Google font searches passed.
- Isolated QA project: Studio insertion/prop update/overlay placement, both shadow
  types, mixed media/text/caption effect patch, stale revision rejection, atomic
  invalid target rejection and bundled font preparation all passed.
- The user's working video was not edited and no transcription or dubbing job ran.

Local QA output: ~/Documents/Cut Room/MCP-global-verification-330f811f.
