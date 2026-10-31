# Local sound effects

Scope: a Sounds rail tab with named, categorized audio, audition controls, and
drag-and-drop placement into the existing timeline. Preserve the editor theme,
media/caption/text tools, project isolation, saved clips and user browser sessions.

## Design references

- [VEED sound effects](https://mobbin.com/screens/6a56cf6f-884e-45d2-8bac-d2fea6429301) shows search, category controls, category headings, named sounds, preview buttons and waveforms in a side panel. This is the primary reference for the new panel's organization.
- [Adobe Express audio](https://mobbin.com/screens/99c84143-e45a-4f9c-a428-481833366670) shows a compact searchable audio panel with named sound rows and a preview control. It supports the row treatment, kept in Cutroom's existing colors and components.
- Synthesia's music modal, Riverside's collection tiles and TikTok's full library table were inspected but are not used for the panel layout. They devote more space to catalog browsing than the requested editor rail panel.

The existing Button, IconButton, Input and Radix DropdownMenu are composed with
native category/file inputs. No dependency, new theme, cover art or screenshot
asset is added. Rows include real waveform peaks and duration. Dragging shows a
time marker and highlights a matching audio track. The plus button is the
keyboard/touch alternative and places a sound at the playhead. Searching,
loading, empty, failed-preview, import progress and partial-import errors have
explicit states. The narrow-screen media panel layout is retained.

## Storage and import

`server/soundLibrary.ts` stores audio and `library.json` under
`~/Documents/Cut Room/Sound Library`, or beneath the configured project root.
The index retains names, categories, duration, frame count, waveform peaks,
content hashes and source links. Index replacement is atomic; a process lock
serializes server and command-line imports. SHA-256 deduplicates file contents.
Paths are bounded to indexed filenames, and audio preview uses local file
streaming with range support. Files are capped at 25 MB/two minutes.

The panel accepts audio files or a selected folder in batches of 20. MCP imports
accept up to 100 paths. Project placement copies media into the project, creates
an ordinary audio clip and uses the existing overlap/track rules. Browser edits
use the current draft; MCP placement requires a saved revision and never
overwrites a conflict. Search returns up to 200 matches, so larger collections
can be narrowed by name or category. Only one preview plays in the panel, and it
stops when the panel closes or the user begins dragging/adding a sound.

## SoundButtonsWorld batch

For an explicitly requested batch:

```sh
node --import tsx scripts/import-soundbuttonsworld.ts --limit 50
```

The importer reads public catalog data embedded in public pages and fetches the
public `/uploads/` MP3 files. It does not use accounts, cookies, private APIs or
provider keys. Requests are sequential and paced; access/rate-limit rejections
stop the batch. A JSON report beside the library records completion and errors.
No audio or private catalog is committed or shipped with the public repository.
The original source URL is retained; download availability does not add a new
license to an imported file.

The requested first batch imported **50 unique sounds**, with 40 categorized as
Sound Effects and 10 as Reactions by the source site, totaling about 9.6 MB.
All 50 files were parsed as audio and had waveforms extracted; none were missing,
failed or duplicated. No project timeline was changed to prepare the library.

## Validation boundary

TypeScript and production compilation are checked. The authorized 50-download
batch was executed. Browser controls, drag gestures, live project changes and
trial exports were not exercised, following the user's standing instruction.
No before/after screenshots were captured. Runtime visual and interaction review
remains with the user. Static component compliance is **4/5, provisional**:
existing controls/tokens and responsive panel patterns are reused; audio rows
and the drop marker are editor-specific compositions, with a button alternative.
