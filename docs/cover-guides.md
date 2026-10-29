# Cover crop guides

Scope: one compact preview control in the upper-right corner of the canvas
toolbar, visible only in cover mode. Preserve frame selection, text dragging,
project dimensions, timeline positions, export output and the existing theme.

## Research and limits

Checked 2026-10-28. A cover's thumbnail crop and a playing video's interface
safe zone are different checks:

- [TikTok cover guidance](https://support.tiktok.com/en/using-tiktok/creating-videos/editing-posting-and-deleting) describes the selected cover as a thumbnail used in profiles and search. Its searchable help text does not establish one guaranteed grid ratio.
- [TikTok in-feed specifications](https://ads.tiktok.com/resources/help/article/tiktok-auction-in-feed-ads?lang=en) explicitly make the ad safe zone depend on orientation, caption length and additional formats. Its device preview can differ from the live placement. Those ad templates are not a specification for a profile-cover crop.
- [TikTok profile, Mobbin iOS](https://mobbin.com/screens/91258930-4342-401f-bd03-b670c1302e08) shows three portrait thumbnail columns. The visible tiles are approximately 3:4; that observation informs the TikTok preset, not a universal platform guarantee.
- [Instagram profile, Mobbin iOS](https://mobbin.com/screens/227b9b6e-f606-4d12-b941-62b1c52f4d4c) likewise shows approximately 3:4 tiles. [Another Instagram capture](https://mobbin.com/screens/daf08d43-f000-4927-a9ef-4846151d4443) shows square tiles in an All posts view. Different surfaces/captures reinforce the need for explicit preview shapes rather than one promised safe area.

Presets are **approximate centered crop previews**: TikTok profile 3:4,
Instagram grid 3:4, portrait feed 4:5, and square 1:1. They simulate the selected
shape, not platform placement controls, app interface occlusion, repositioned
thumbnails or every device. These limits are documented here; the compact menu shows crop choices only. No third-party
size chart is treated as an official specification.

## Design decisions

Anchor: [Frame.io viewing options, Mobbin web](https://mobbin.com/screens/4933c75b-4209-49ff-a6a9-68050fb2e12f)
shows Guides alongside other player viewing options, with its current state.
Take that separation from editing/export settings. The user's requested corner
placement is retained, using the editor's own buttons, Radix menu, icons and
neutral color tokens. Other video-editor search results showed selection bounds
or media adjustments, not safe-area controls; they were not cited as precedents.

The left part of the split control toggles the remembered guide. Its arrow opens
a compact radio menu: No guides or exactly one crop preset. The menu omits
a heading and explanatory footer. A fixed-width check column and left-aligned
labels prevent the options from spreading across the menu. Selected radio indicators
cannot appear on two presets at once. Outside the crop is dimmed; a thin boundary
and small label identify the remaining area. The overlay passes pointer events
through so existing cover text selection and dragging work underneath it.

The crop is the largest rectangle with the selected ratio that fits inside the
project canvas. It therefore works for portrait, square and landscape projects,
with symmetric clipping along the appropriate axis.

## Persistence and export boundary

The preference is stored by project and editor-instance ID in local browser
storage. It is not in the project manifest, undo history or Remotion input props.
The overlay is a DOM sibling of the Player; neither MP4 nor companion/standalone
cover PNG rendering imports it. No server, provider or paid generation call is
made by this control. Existing browser tabs are not reloaded or navigated.

## Validation

TypeScript and production compilation pass. No UI controls, user projects,
screenshots or trial exports were exercised, following the user's instruction.
Interaction and narrow-screen appearance remain for user review.

Static component compliance: **4/5, provisional**. Existing Button, Tooltip,
Dropdown Menu and Radix radio primitives supply control semantics; theme tokens
and existing icon sizes supply chrome. The custom crop matte has no generic
editor component equivalent. Its white edge/dark mask provide contrast over
footage, with pointer events disabled and accessible status supplied by controls.
