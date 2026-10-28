# Timing controls

Scope: the single selected clip's Timing section. Keep the current theme,
timing semantics, split/duplicate/delete actions, source window, and all other
inspector sections. The user's request is to make this section easier to adjust,
following the fade controls. Do not interact with the live working editor.

References inspected in Mobbin:

- [VEED timing](https://mobbin.com/screens/68fa93fe-bcdb-4879-8c9d-3c7e30d1c649):
  grouped start/end values in its duration controls.
- [VEED audio controls](https://mobbin.com/screens/2155933a-f98d-4471-8b70-7c98450b6f4b):
  labeled sliders with compact editable-looking value readouts. The visible
  example is fades, not timeline position. Cutroom adapts this existing control
  pattern to Start at and Duration at the user's request.
- [Runway](https://mobbin.com/screens/18f8ac3d-06de-4840-b8f3-6fa312ddbe9a):
  a miniature selected range. Considered as an alternative; a second timeline
  inside Timing would duplicate the main timeline, so it was not implemented.

The selected direction uses full-width slider rows and compact seconds values,
matching Cutroom's fade controls. Start at moves the whole clip; Duration changes
its right edge. Ends at is derived from their sum. The labels, derived readout and
placement are Cutroom decisions. Exact values remain editable and Escape cancels
text edits. Duration cannot be less than a frame or exceed available source.

Start's slider uses the current timeline extent, frozen during its gesture so the
scale does not move under the pointer; exact seconds can also place clips beyond
that extent, up to the existing one-hour position limit. Gestures checkpoint once
and rebuild placement from the original project with a stable temporary track ID,
so sliding across overlaps does not accumulate empty tracks.

No browser interaction, screenshot capture, tests, media generation or exports
were performed. Compilation is allowed. Static shadcn compliance: **4/5,
provisional**. Existing Radix Slider, Input, tokens and focus states are reused;
runtime behavior and responsive/assistive-technology review remain unverified
under the user's instruction to test the editor themselves.
