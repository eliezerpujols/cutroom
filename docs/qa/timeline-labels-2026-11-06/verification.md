# Timeline label alignment — 2026-11-06

Long caption names expanded the sticky label column beyond its 132px basis;
media track names wrapped, leaving the ruler and track lanes misaligned.

The shared label now allows its contents to shrink within the existing width.
Media, caption and text names use single-line ellipsis, while kind icons and
visibility/mute controls retain their sizes. Existing accessible names remain.

Verification:

- `npm run build` passed (existing large-chunk advisory).
- `npm test` passed: 95 tests.
- `npm run check:global` passed for both linked skills and the global MCP.
- `npm run check:mcp` passed with a fresh connection and 51 tools.
- Visually checked the rebuilt production editor with the screenshot's Spanish
  caption, Persona and Studio track names. All visible label boundaries align
  with the ruler, names stay on one line, and row controls remain visible.

The pending Studio elements and their assets were synchronized in a separate
commit from this CSS correction.
