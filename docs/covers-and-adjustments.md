# Covers and adjustments

Scope: add cover authoring and RGB image adjustments to the existing editor.
Preserve neutral white/gray and charcoal themes, forest actions, yellow audio,
existing project isolation, media timing, caption tools and export behavior.

## Reference decisions

The supplied Figma frames were read directly:

- [White rounded title card, 26:82](https://www.figma.com/design/nEw6oajcSUL2irEFU2Pm1Q/Untitled?node-id=26-82): bold black multiline title inside one white rounded background.
- [Yellow line highlight, 32:12](https://www.figma.com/design/nEw6oajcSUL2irEFU2Pm1Q/Untitled?node-id=32-12): bold black title with yellow backgrounds following its lines.

The examples inform editable presets; no screenshot/video pixels or temporary
Figma asset URLs are shipped. Inter remains the default editor font.

Reviewed Mobbin references:

| Reference | Applied decision |
| --- | --- |
| [Suno cover frame](https://mobbin.com/screens/19f90658-f03c-46d9-af45-0ff9039be090) | One large exact frame, compact filmstrip and a selected-frame marker. |
| [TikTok cover selection](https://mobbin.com/screens/88160993-731a-4523-bdba-4ec119096285) | Cover as its own focused editing mode. Keep output dimensions explicit. |
| [VEED text presets](https://mobbin.com/screens/f7116a23-4ca0-4c2c-8139-b89e61e9332c) | Visual Title card / Highlight / Text only choices before fine styling. |
| [Pinterest text overlay](https://mobbin.com/screens/b954ea51-6c0c-45d0-ae5b-fd481d5c6a40) | Contextual text formatting, background, alignment and placement. |
| [Synthesia typography](https://mobbin.com/screens/aef72e0e-582e-4caf-b5ec-eab687e33f02) | Selected text reveals font, weight and familiar bold/italic controls. |
| [Vimeo text canvas](https://mobbin.com/screens/b4104d93-d645-4109-a9e7-d26706071448) | Direct canvas placement with visible selection. |
| [VEED filters](https://mobbin.com/screens/07fba964-8b9e-4133-9af6-55ca7c3fd4d4) | Separate Adjust rail tool and recognizable thumbnail looks. |
| [Wix Photo Studio](https://mobbin.com/screens/6a805a3d-b440-4ce6-b98c-ffa686c56141) | Original, named presets, strength and a clear reset. |
| [Higgsfield color grading](https://mobbin.com/screens/974ef91a-b28e-47fa-b8a3-e9a4f1f0f2f5) | Group color controls into focused sections instead of a long mixed settings form. |
| [Adobe Express text fill](https://mobbin.com/screens/7882ebec-86d5-44bd-a5a3-ebc0e326fe4b) | Independent text and background color controls. |
| [Telegram text editor](https://mobbin.com/screens/426c9ffc-7f82-447f-b252-e059875cd33a) | Compact formatting with immediate canvas feedback. |

Also reviewed Hootsuite, Semrush, Descript, Riverside, Runway and Synthesia media
settings; kept the more directly applicable frame, text and filter patterns above.
No Mobbin screenshot is bundled or used as a UI asset.

## Behavior and implementation

The square Cover tile lives in the timeline's sticky label column; frame zero
and clip positions do not move. The tile/picker reuse approximate cached media
thumbnails to avoid new rendering during editing; the main canvas and exported
PNG use the exact selected timeline frame. A cover PNG keeps the project ratio,
is exported separately, and never prepends footage or alters duration.

Text supports multiple independently movable blocks. Style presets, color,
outline, font, bold, italic and alignment are primary controls; exact placement,
box width, padding and roundness remain contextual. The two Figma backgrounds
are implemented with an editable rounded card and per-line highlights.

Adjust provides edit-wide looks and light/color sliders. Clip-specific controls
are in the inspector. Clip filtering precedes global filtering, using CSS RGB
brightness/contrast/saturation and an sRGB matrix for temperature/tint. Caption
and cover text overlays are outside the filtered media wrappers. The same React
composition is used for preview, MP4 and PNG so adjustments persist on export.
Still PNG/JPEG/WebP imports use image rendering on video tracks. Existing project
documents load without either optional configuration; no migration rewrites them.

MCP tools: set_cover, set_visual_adjustments, export_cover. Edits retain revision
checks and return scoped new-instance URLs with a view hint. Skills document the
coordinate units, filter scope and separate-still behavior. No provider calls or
credentials are needed.

## Validation boundary

TypeScript and the production build are checked. No automated tests, live editor
interaction, reload, screenshot, user-project edit, or trial render was performed,
following the user's instruction. Runtime interactions and rendered output await
their review.

Static component compliance: **4/5, provisional**. Reused existing Radix Slider,
Button, IconButton, Input, native editor color/select/switch patterns and theme
tokens. Custom filmstrips, cover tile and drag targets are media editing controls
with no existing base component; keyboard position alternatives are provided.
Mobile and assistive-technology behavior are not claimed as runtime verified.
