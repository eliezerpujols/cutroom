# Captions and text tools

Scope: extend the media sidebar into a Media/Text tool rail, add automatic
transcription, a dedicated caption timeline layer and editor, and caption style
settings within the left panel. Keep the existing neutral/charcoal themes, source
media, video/audio editing, autosave/revision checks and export controls.

## References inspected

| Product | Decision used | Screen |
| --- | --- | --- |
| VEED | tool rail and a compact spoken-language/auto-subtitle action | [Screen](https://mobbin.com/screens/2a1fa866-2e2d-4c60-9b10-93715126946d) |
| Arcade | timestamped caption list alongside the video and a caption row on the timeline | [Screen](https://mobbin.com/screens/9cf2acbc-d086-417c-84a5-ea4e7b5168f1) |
| VEED | caption typography and per-word highlight controls | [Screen](https://mobbin.com/screens/f1c49ca8-798b-4203-a725-776eabbaf31c) |
| Synthesia | caption style surface with stroke thickness and a highlighted word | [Screen](https://mobbin.com/screens/3e96b0c0-b1d5-4262-912e-d1b79b734f50) |

The selected direction uses labeled tools, a transcript list and a separate style
surface. Riverside/Descript's transcript-wide edit menus were considered but not
carried over: this feature edits caption cues rather than the underlying footage.
The panel placement, copy, grouping limits, keyboard behavior, default Inter and
motion choices are Cutroom decisions shaped by the user's request. The palette,
type scale and local Button/Input/Slider primitives stay in Cutroom's system.

## Implementation constraints

Caption layers are optional project data, so existing projects stay compatible.
Words store cue-relative frame timings; layers retain source job IDs and audio
signatures. The renderer paints captions after video layers and uses bundled font
CSS for preview and export. SRT/VTT use the display grouping and contain plain text
and timings; MP4 renders typography, outline, colors and motion.

The UI merges completed captions into the current draft. Source changes during
generation require an explicit choice before earlier timings are added. Later
audio changes show a sync reminder. Box-selection, modifier-click and group
dragging include caption cues alongside timed text and media clips. Moving a
selection uses one offset and preserves cue-relative word timing. Individual cue
edges still resize one cue, using existing undo, zoom and pointer cleanup patterns.
Opening Text only reads a local cost estimate. Temporary missing routes or server
restarts show a neutral connecting state with bounded automatic read retries;
they are separate from transcription errors. No paid request is retried by that
availability check.

The backend mixes the actual audible timeline to temporary 16 kHz mono FLAC,
checking included provider credits and the configured cap before submission.
Only a requested start calls the provider. Jobs and raw successful transcripts
stay inside the project. Stable request IDs prevent repeat submissions after a
lost response; unknown/interrupted paid outcomes stop instead of replaying.
Temporary mix/filter files are removed on completion/failure.

API specification: [ElevenLabs create transcript](https://elevenlabs.io/docs/api-reference/speech-to-text/convert).
Pricing estimate basis: [ElevenLabs pricing](https://elevenlabs.io/pricing),
330 credits/minute on the date of implementation, with a 50% plus 100-credit
reserve. Account billing can differ; this is not a guaranteed provider quote.

## Validation boundary

No live editor controls, saved user timeline, paid transcription, test export or
screenshots were exercised, following the user's no-testing instruction.
TypeScript/build checks are permitted. Provider permissions, FFmpeg mixing,
caption rendering and interaction behavior remain unverified at runtime.

Static shadcn compliance: **4/5, provisional**. Existing Radix sliders and local
buttons/inputs, semantic tokens, focus styles and icons are reused. The native
select/checkbox/color fields follow existing editor patterns. Caption timeline
gestures are custom; mobile and assistive-technology checks await user review.

## Styles on selected cues

Caption cues may optionally store a partial `style` override. Rendering merges
this with the parent layer style, keeping word timestamps and content intact.
The multi-selection inspector compares effective styles, displays Mixed where
values differ, and applies only the properties edited. Selecting every cue in a
layer updates its base style and clears only the corresponding cue overrides.
Layer-wide styling does the same, so inherited and overridden values agree.
SRT/VTT grouping respects each cue's effective display mode. Older projects need
no migration; missing spacing values retain the original rendering defaults.

## Caption editing on the canvas

Paused captions share the title canvas interaction: double-click to edit the
full cue directly, even when its display mode currently shows just a word or
phrase. Committing uses the existing cue text replacement logic, retaining word
timestamps when the word count stays the same and distributing timing over the
same cue interval otherwise. Text editing never changes the cue interval.

Drag positions apply to the current cue through the existing style override
model. Optional horizontal position, width and alignment default to the former
centered 88% box; old caption projects render the same way. Position bounds now
allow the whole canvas. Preview controls and rendering share the active cue and
phrase calculation. Guides and inline editor state are excluded from exports.

## One caption style panel for every selection

Single-cue, whole-layer and multiple-cue styling use the same `CaptionStyleEditor`
in the left Caption style panel. The right inspector uses the same Edit caption
style action for one or multiple captions. The style panel states its target:
N selected captions or all captions in the named layer. Opening the style action
preserves cue selection; selection across layers also edits only those cues.

The Word / Phrase / Sentence segmented component, transition selector, outline,
highlight, typography and placement controls keep their order in every case.
Mixed values are represented by neutral segment states, Mixed outputs/options,
indeterminate checkboxes and mixed color swatches. Editing a property applies
that property to the selected cue styles through the existing override rules.
Text and media in a mixed selection are untouched by caption styling. Changing
cue selection while the panel is open updates its scope instead of closing it.

Validation for this change: TypeScript and production compilation only, plus
static component review. No browser gestures or live project mutations were run,
following the user's instruction to handle interaction review themselves.
