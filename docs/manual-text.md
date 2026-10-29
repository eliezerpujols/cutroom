# Manual video text

Scope: Text must support authored on-screen text, with automatic transcription
remaining one option. Preserve caption generation, transcript editing, cover
authoring, media editing, existing themes, project isolation and export behavior.

## References

- [VEED Add Text](https://mobbin.com/screens/873687b5-a057-41db-9052-795035e1f514) shows a heading entry, style choices and authored text separately from a subtitle row. Take the priority given to manual text and a few preset choices.
- [Riverside Text](https://mobbin.com/screens/6c52ed45-d7fc-4a01-9179-2ea8bd9e89db) offers Add title / Add subtitle / Add text before other styles. Take the explicit authored-text choices rather than treating speech transcription as the whole tool.
- [Vimeo text editing](https://mobbin.com/screens/b4104d93-d645-4109-a9e7-d26706071448) shows a directly selected canvas text box and its own timed timeline clip. Take direct positioning and separate timing, while retaining Cutroom's existing inspector for formatting.

Other search results showed speech captions or transcripts; they were not used
as evidence for authored-text controls. Reference screenshots are not bundled.

## Implementation

Text opens with Add text, Heading / Subtitle / Body presets, and an authored-text
list. Auto-transcript is a collapsed secondary option. Opening the general Text
panel no longer requests a transcription estimate until that option is expanded;
existing submitted jobs still resume/poll through the established caption hook.
No provider call or key is needed to create manual text.

`project.texts` is an optional backward-compatible array of timed objects. Each
gets its own row; new text is topmost. Timing uses start-inclusive/end-exclusive
30 fps frames. Timeline bodies move intervals, edges trim them, and the existing
Split action splits a selected title at the playhead. Arrow keys, duplicate,
hide, remove and normal undo are supported. Text is independent of media group
selection and caption cue editing. Titles may extend the overall timeline.

Typography and canvas drag behavior were extracted from cover editing into shared
components. The same fonts, color controls, background styles, bold/italic,
outline and placement controls therefore serve cover text and timed video text.
Manual text renders outside footage color filters and above automatic captions;
cover-only titles remain above it when rendering a still. Hidden text is omitted.
The paused preview has transparent pointer targets over the rendered text; the
exported frame contains the rendering component, not its selection outline.

The shared Remotion composition renders timed text in previews, MP4, and any cover
frame where it is active. SRT/VTT remains a caption-layer export. Project validation
checks IDs, timing and style bounds, with 100 text objects and 500 characters per
object. Old projects need no rewrite. MCP edits require the saved revision and
return a new scoped editor URL focused at the selected title's start.

## Object shortcuts

The editor shares Delete, Command/Ctrl+D, X/C/V with Command/Ctrl across cover
text, timed text, media selections and caption cues/layers. Cut stores a cloned
object snapshot before removing it. Paste creates fresh IDs, preserves styling
and group spacing, and places timeline items at the playhead. Duplicate places
timeline copies after the selected interval; cover copies have a small position
offset. Text can move between cover and video contexts. The clipboard is kept
in memory for the current editor tab; native text fields keep OS clipboard
behavior. Object commands use a guarded capture listener so child clip handlers
do not apply Delete twice. Undo/redo use the same project history as other edits.
Limits are checked before edits; failed pastes leave the project untouched.

## Validation boundary

TypeScript and production compilation pass. No live controls, screenshots, user
project edits, paid requests or trial exports were exercised, following the user's
instruction. Interactions, responsive layout and rendered output await user review.

Static component compliance: **4/5, provisional**. Existing Button/Input/Slider,
native details/select/color/switch patterns, theme tokens and icons are reused.
The custom timeline and canvas targets are editor-specific and have keyboard
alternatives. Browser/accessibility behavior has not been claimed as verified.
