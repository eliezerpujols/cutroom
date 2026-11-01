# Library drag-and-drop guides

Media, Sounds and Text panel drags use the same green timeline insertion guide
and time badge. The final placement uses the same frame calculation as the guide,
including horizontal scroll, zoom and snapping to the playhead or any timeline
item's start/end. Hold Shift to bypass snapping. Drops can land after the current
last frame, rather than being clamped to the old duration.

Video, image and audio media rows and sound rows create clips from their source.
Compatible media tracks are highlighted when hovered. A drop over another kind of
row uses the matching media kind; video/image and audio overlaps keep the existing
separate-track placement behavior. No item is inserted until drop.

Text supports dragging Add text or Heading/Subtitle/Body presets to create a new
text clip. Clicking those controls keeps its existing behavior. Dragging a row
from Your text moves that existing text clip, preserving style and duration.
Dragging a transcript entry moves that caption cue on its existing caption layer,
keeping its text, relative word timings and duration. Existing text/caption rows
are moved, not copied. Each drop is one undoable edit; dropping at the original
frame does not create an edit. The 100-text limit also applies to dragged presets.

Only internal Cutroom drag types are accepted. Incoming IDs and preset values are
checked against the current project or supported presets. Source IDs never execute
as instructions. Browser drag-over data remains private; media-kind tags in the
native drag types allow compatible-row highlighting without reading the protected
drag payload before drop. Leaving the timeline, canceling or finishing a drag
clears its guide. Moving across children inside the timeline retains the guide.

Validation: TypeScript and production compilation. No browser drags, playback,
real project edits or trial exports were exercised, per the user's instruction.
