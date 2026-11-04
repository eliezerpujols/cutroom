# Motion controls — 2026-11-04

Scoped visual refinement of the settings below Motion / Styles tiles:
- Reused StyleNumber inside the shared StyleRange's optional editable header.
- Consistent label size, unit fields, aligned values and vertical spacing.
- Reused existing playback preset buttons for Once / Loop; neither is selected
  when a multi-selection has mixed playback settings.
- Cycle is now labeled Duration; stored frame values are unchanged.
- Build and diff whitespace checks pass. Browser verification changed intensity,
  duration and loop mode; saved API values were 50, 60 frames and true.
- Existing project content was not edited; QA used the separate font sample.

Mobbin was consulted, but no close motion inspector reference was returned.
The implementation follows Cutroom's existing number fields and speed presets.
