# Effects, typography and MCP coverage

Use the current project revision and real IDs before editing. Effects are local,
shared by preview and export, and use 30 fps frames. Do not confuse the Studio
library (reusable components with editable props) with Effects (styling applied
to a selected item). For Studio authoring and insertion, read
[Cutroom Studio](../../cutroom-studio/SKILL.md).

## Selection and visual controls

Effects separates Animation, Motion, Styles and Appearance. Animation contains
In, Out and Between. Persistent blur/masks belong in Appearance, outside those
animation tabs. Blue dots indicate applied settings on the current selection.
Circle is a centered, inscribed circle based on the shorter viewport side, not
an ellipse. Rounded uses a uniform corner radius of 8% of the shorter side.
Both masks preserve the media aspect ratio and share preview, cover and MP4
rendering; overlay masks use the overlay viewport dimensions.
Between transitions use an eligible preceding item; the timeline badge and
shaded span show the transition and duration. A setting alone does not guarantee
an eligible neighbor. Videos need touching edges on the same track; text has
its own pairing rules in `src/textTransitions.ts`.

Multi-selection edits apply the changed property to compatible selected items
and preserve their other values. Mixed values must not silently copy one item's
entire configuration onto the others. Batch playback edits can change duration;
inspect the resulting timing and track placement. Audio has no visual effects.

Motion includes pulse, explode, shake, handheld, flash, super zoom, super shake,
echo and tunnel. Pulse, explode, flash, super zoom, echo and tunnel expose
Rise/Hold/Return timing. The saved `motionTiming` has integer frame values:
rise/return at least 1, hold at least 0, total at most 900; keep `motionFrames`
equal to that sum. `motionLoop` repeats the cycle; these settings do not move the
clip. Styles include color shift, flicker, negative flash, blur, details, sparkles
and fisheye. Use the implemented catalogs in `src/continuousEffects.ts` for IDs.

Selected titles and captions additionally expose text-specific In/Out animations
(typewriter, word by word, cascade, rise, bounce, wave, flip, spin, pop, blur reveal,
scatter and spread), text motion, text styles and appearance. Read
`src/textEffects.ts` for current IDs; preserve grapheme/connected-script handling.
Do not promise every conceivable animation. Between uses its own transition
catalog rather than every text entrance preset.

Text, cover titles and captions expose Font Size as an editable px field beside
the slider. The field accepts finite sizes of at least 16 px without an upper
limit. The slider expands its range between gestures while keeping its scale
stable during a pointer drag. This uses shared `StyleRange` with `editable` and
`unbounded`; other bounded controls keep their existing limits. Typed edits,
mixed selections, keyboard access and one-gesture undo reuse `StyleNumber`.

## Independent text shadows

Text, captions and cover titles can have drop and inner shadows simultaneously:

```json
{"shadow":{"drop":{"enabled":true,"color":"#000000","opacity":60,"blur":8,"x":0,"y":4},"inner":{"enabled":true,"color":"#000000","opacity":40,"blur":2,"x":0,"y":1}}}
```

Color is six-digit hex, opacity 0–100, blur 0–40 and offsets -40–40 composition
pixels. Legacy `shadow.mode` and flat settings remain readable for saved work;
use nested `drop`/`inner` for independent shadows. Preserve existing nested values
when changing one field. In particular, `edit_text` replaces a provided shadow
object, so merge it with the saved shadow first. The UI uses two compact rows
with independent visibility and a settings popover, not stacked slider forms.

## Actual tool coverage

Source verified against MCP 2.11.0. The connected tool list is authoritative for
what this chat can call; a running connection may still expose an older version.

| Capability | MCP support |
| --- | --- |
| Studio discovery / insertion / props | `list_studio`, `set_studio_element`; placement with `set_clip_overlay`, timing with `edit_project`. |
| Batch light/color and playback | `set_visual_adjustments` with `clip_ids`; batch `edit_project` operations. |
| Timed title effects | `list_effects` with `target_kind=text`; `set_effects` with `kind=text` for partial patches. `edit_text.values.effects` still accepts complete effects objects. |
| Drop + inner shadow | `add_text`, `edit_text`, `set_cover`, and layer style in `edit_captions` accept nested shadows. |
| Google fonts | `list_fonts` searches families and categories with pagination; `prepare_font` caches the family in the project. Style tools accept exact returned family names. |
| Media/Studio and caption-cue effects | `list_effects`, then `set_effects` with `kind=clip` or `kind=caption`. Caption targets use cue IDs, not layer IDs. |
| Font category tabs, drag handles, effect previews, activity dots | Editor interactions; not separate MCP actions. |
| Person cutout / face-centered camera | Local Apple Vision through start/status/cancel/apply tools; see [camera tools](camera-tools.md). Active-speaker detection remains research. |

For an unsupported edit, use the existing editor or inspect the local implementation
before a revision-protected API update. Do not invent tool names or claim full MCP
parity. Do not rewrite a project file directly or overwrite an unsaved browser draft.

## Applying effects through MCP

Read `get_project`, then `list_effects` for the relevant target kind. Call
`set_effects` with `project_id`, `expected_revision`, `targets` and a partial
`effects` patch. Example target: `{"kind":"clip","id":"actual-clip-id"}`.
Kinds are `clip` (video/image/Studio), `text` and `caption` (cue).
Mixed batches preserve each item's other values. Audio, unknown IDs and
text-only effects applied to media reject the entire request. `reset=true`
clears all effects on the targets before applying the patch.

A patch such as `{"motionTiming":{"hold":30}}` preserves each item's rise and
return times, recomputing its cycle length. `motionFrames` resizes existing
phases proportionally. Read the returned revision before another edit; conflicts
must be reconciled, never retried blindly. The tool returns a new editor URL.

`list_fonts` accepts query, category, offset and limit. Categories are All,
Sans Serif, Serif, Display, Handwriting and Monospace. Pass the returned `family`
unchanged to typography tools. `prepare_font` downloads/cache-copies font files
without changing timeline styling or revision; initial Google downloads require
network access. Bundled families need no download.

## Maintaining coverage

When a Cutroom feature changes, check its saved schema, preview/export renderer,
MCP discovery and edit support, and the relevant skill together. The global `~/.codex/skills/cutroom*` entries link to repository
`.agents/skills/cutroom*`; edit the repository source, not a second copy. Run
`npm run check:global` to verify both skill links and global MCP registration.
Verify tools/list on a fresh MCP process; rebuilding the editor or restarting its
HTTP server does not refresh Codex's existing MCP connection. If a tool is missing
from that connection, use the fresh MCP bridge in the main skill. Test in a separate
project and preserve the user's edit.
