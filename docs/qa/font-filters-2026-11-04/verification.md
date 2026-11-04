# Font style filters — 2026-11-04

- Shared font picker now has All, Sans, Serif, Display, Script and Mono tabs. Accessible labels use the full category names Sans Serif, Handwriting and Monospace.
- Uses existing Google catalog categories, including cached families; bundled Peacock is Display. Both installed and Google groups sort alphabetically by display label. Bundled aliases and cached duplicates are deduplicated.
- Font rows explicitly use one vertical flex column, do not shrink, and never scroll horizontally. Search and tabs remain outside the scrolling results.
- Existing Button primitives and Effects tab visual/keyboard conventions are reused. Search combines with category; category changes reset the active option and list scroll. Arrow Left/Right and Home/End navigate tabs; Arrow Down returns to the search combobox; Enter selects a font. Escape is contained by the popover.
- Build passed; 59 tests passed. New tests verify alphabetical groups, aliases, deduplication, every category, cached-family classification and combined query/category results.
- Browser checked Serif and Display lists, no-results state, keyboard tab changes and keyboard selection of cached Lora. Reopening returns to All and preserves the applied font. DOM check found no horizontal overflow in the font list.
- QA project only: f93c5670-0f76-4e2f-9707-6295794a492e. User project was not changed for testing.
- Screenshot: editor.png.
