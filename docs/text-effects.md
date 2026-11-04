# Text effects

Text and caption selections share the Effects gallery. Selecting only titles and/or caption cues exposes text presets; media and mixed media/text selections retain the compatible whole-layer presets. Audio is not a visual target.

- Animation: Typewriter, Word by word, Cascade, Rise, Bounce, Wave, Flip, Spin, Pop, Blur reveal, Scatter and Spread, for both In and Out. Duration sets the complete sequence; Stagger distributes the start of each unit within that duration. Letters/Words changes the animation unit, except the explicitly word-based preset.
- Motion: Wave, Bounce, Float, Jitter, Pulse letters and Ripple, with Intensity, Duration, Once/Loop and Letters/Words.
- Styles: Gradient, Neon, Chromatic, Metallic, Rainbow and Duotone. Relevant presets expose Accent or Intensity.
- Appearance: Outline, Soft shadow, Extrude, Glow and Highlight, alongside existing Blur. Accent applies where relevant.
- Between: Crossfade, Slide and Wipe for adjoining titles at the same position or successive captions within one layer (up to a one-second gap). The incoming item's duration bounds the transition. A title's layer renderer retains the full project to resolve its preceding title.

The Basic disclosure preserves whole-block animations without overwhelming the text gallery. Thumbnails animate on hover/focus, honor reduced motion and use a dark background for luminous text styles. Active category dots do not change tab widths. Controls reuse StyleNumber, StyleRange, StyleColor and the existing segmented buttons.

`AnimatedText` is shared by preview and Remotion export. Grapheme segmentation preserves emoji and combining marks. Arabic and Indic text uses whole-word units to preserve joining. Caption word/phrase windows and word highlighting remain authoritative; highlighted words override text-style fill color. Existing projects retain plain text rendering until a text effect is applied. New effect properties are optional and validated by the persisted project schema.

References reviewed: [Canva text animation](https://www.canva.com/learn/how-to-use-text-effects-animations/), [Apple Motion Sequence Text](https://support.apple.com/guide/motion/apply-the-sequence-text-behavior-motn1607c46e/mac), and [Adobe text animation](https://helpx.adobe.com/after-effects/desktop/animating-text/text-animation/animating-text.html). [Mobbin Canva fade control](https://mobbin.com/screens/f884b219-1dff-4e2c-94bb-15df9ba448cc) informed compact contextual controls; it was not an exact text animator reference.
