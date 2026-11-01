# Inspector item actions

Every selected content type uses `InspectorItemHeader` and `InspectorActions`.
Place the action group beside its name and detail, in this order:

1. Show/hide (mute/unmute for audio)
2. Duplicate
3. Delete

This applies to video, images, audio, timed text, cover text, caption cues,
caption layers, and selections. Do not add a second delete or visibility action
below the timing or appearance controls. Leave formatting and timing controls in
their own sections. Icon buttons retain accessible names and tooltips.

Visibility preserves the item and its timing. Video/image visibility hides the
picture; embedded audio keeps its independent mute control. Audio visibility
mutes that clip. Caption cue visibility affects that cue; caption layer visibility
affects the whole layer. A mixed selection's first click shows all its items.
Hidden captions are also omitted from subtitle files. Hiding does not change
source files, layer order, or timeline length. Changes use normal project undo
and save handling; optional `hidden` fields keep older projects compatible.
