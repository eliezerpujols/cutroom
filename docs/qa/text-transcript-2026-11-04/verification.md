# Text / Transcript split — 2026-11-04

Text and Transcript now have independent toolbar entries and panel components.
Text keeps creation, presets and authored titles. Transcript keeps generation,
caption rows/layers, caption style and SRT/VTT export. Shared selection and drag
behavior are reused. Title selection opens Text; caption selection/style opens
Transcript. Direct `view=transcript` links work. The toolbar remains vertically
scrollable at short heights without clipping its longer Transcript label.

Validation: `npm run build` passed (existing large-bundle warning). Browser checks
in the separate Shadows QA project verified direct Transcript navigation, Text
contents, title creation, caption timeline selection, Caption style, generation
settings disclosure, and the rebuilt rail at 1378×1168. Screenshots: text.png and
transcript.png. No transcription request was started. The user's working project
was not edited or reloaded. Opening its new result tab timed out in browser
navigation; the fresh editor URL is supplied in the response instead.

Cutroom's installed and repository text/caption references were updated together.
Reference: https://mobbin.com/screens/bd482934-e96c-4560-967f-2509d3c341d8
