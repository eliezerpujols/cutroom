# Media library rows

The Media and Sounds panels share list spacing, search and filter controls,
preview/add buttons, waveform treatment and the header add/close pattern. Media
uses small video/image thumbnails instead of full-width cards. Imported audio
has play/pause, a real waveform, duration, download and an add-at-playhead button.
Dragging a row retains the existing asset drag payload and timeline behavior.
Adding at the playhead assigns overlapping video/audio to a separate matching
track, consistent with sound placement.

The + in the header opens the existing file picker. Imports, missing-media relink
and downloads retain the project APIs and original media. The footer shows the
file count. Search and media-type filters affect only the library view.

Audio auditioning pauses the timeline and allows one preview at a time. Preview
resources are released on completion, error, dragging, adding, closing the panel,
changing type, source changes and unmount. A delayed play rejection cannot clear
a newer preview. Thumbnail buttons and the row + insert at the current playhead.

Existing Button, IconButton/Tooltip and Input primitives are reused. The row is
a composition for draggable project assets, sharing Sounds' list styles rather
than introducing another generic list component. All colors come from the editor
tokens. The existing 800px mobile breakpoint is retained, with matching panel
padding and larger row actions. Narrow panels truncate names, retain full names
in titles and accessible button labels, and wrap secondary metadata.

Validation: TypeScript and production compilation only. No browser controls,
reloads, real project edits or trial exports were performed, per the user's
instruction. Component compliance is 4/5, provisional pending the user's runtime
review of desktop, narrow layouts, keyboard interaction and drag-and-drop.
