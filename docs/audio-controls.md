# Audio fades and playback controls

Targeted changes to audio clips and the inspector. Preserve the editor layout,
neutral light/charcoal themes, media, project schema, audio fade semantics, and
existing timing and export behavior.

## References inspected in Mobbin

- [VEED](https://mobbin.com/screens/3be1498a-7db9-43e8-92c4-7589510ca023):
  a fade wedge on the audio timeline and inspector duration sliders.
- [VEED](https://mobbin.com/screens/cf8456a3-34cf-4130-96f8-1dd014d3e86b):
  Fade In / Fade Out sliders with values, plus common playback speed buttons.
- [ElevenLabs](https://mobbin.com/screens/f5e735c8-4f58-4f10-bbcc-d1929db3b35f):
  fade duration and playback speed sliders with value readouts.
- [Runway](https://mobbin.com/screens/f7d89cc8-4b21-4f95-9467-d7ddb7142855):
  a miniature source range. Borrow its visual range only: Cutroom's window
  performs a fixed-duration slip, rather than Runway's illustrated trim.

The exact wording, handle placement and keyboard interactions are Cutroom
implementation decisions. Adobe Express's fade preset icons were not used:
presets alone would hide duration and the location of an existing fade.

## Implementation

The timeline envelope and waveform attenuation share `fadeGainAt` with audio
playback. Both fade lengths can overlap and retain the existing minimum-gain
behavior. Zero fades draw no envelope; persisted fades remain visible without
requiring selection. Selected audio clips expose duration handles. Pointer
gestures checkpoint once, and cancellation restores the original fade.

Inspector controls reuse the existing Radix Slider and local Button/Input
components, theme tokens and focus styles. Editable seconds retain precision
access alongside the sliders. Speed dragging calculates duration from the
gesture's original source span to avoid accumulating frame rounding errors.

The custom source window is justified because a single-thumb slider does not
show the selected span, while an independently movable two-thumb slider would
suggest trimming its duration. It exposes slider semantics, arrow/Home/End
support, a focus ring, disabled state, source bounds, and pointer cleanup.

## Review limits

No browser interaction, screenshot capture, playback, export, generation or tests
were performed, following the user's instruction to leave their working editor
alone. No user project or media files were edited. Compilation is permitted;
runtime behavior, narrow layouts and light/dark contrast await the user's review.

Static shadcn compliance assessment: **4/5, provisional**. Existing primitives,
semantic tokens, icon family and keyboard/focus patterns are reused. The custom
fixed-span source window and direct timeline handles are documented exceptions;
responsive and assistive-technology behavior have not been verified in a browser.
