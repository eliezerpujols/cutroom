# Reel 14 English production — 2026-11-16

English editable copy of the approved Spanish revision 130. User authorized completion without further paid-provider approval prompts, with separate $15 limits for ElevenLabs and Sync, and explicitly requested browser review for frame shifts.

## Project and providers

- English project: `2f273a69-22da-4f67-9aa9-5cef6388eee0`, 1080×1920, 30 fps, 2177 frames.
- Original Spanish project: `917849f9-f0f9-4deb-96c9-8129f7a87716`; preserved separately.
- Dubbing: ElevenLabs automatic `dubbing_v2`, job `57cd92cc-7056-4286-acbc-20d12e136373`. Full original speaker RAW only; no montage/collage supplied to lip sync. Automatic mode does not guarantee a B2 script or particular emotion.
- Lip sync: Sync `sync-3`, generation `05ab395c-3358-4068-9899-7a61f491eb7a`, completed once. Live estimate $11.60; scoped hard limit $15. Existing generation and idempotency key retained; no duplicate paid submission.
- English timing transcription: Scribe v2, job `f567dd5a-b8a3-43ea-b876-f68e4776f886`, completed once. Estimated 400 credits, reserve 700.
- ElevenLabs dubbing estimated approximately $2.67 at the then-current published API rate, plus transcription; this is an estimate, not a reconciled invoice. Credit allocation used included plan credits. Account-wide credit deltas are not treated as exact job charges. No provider plan upgrades or global budget changes.
- English Figma cover: `nEw6oajcSUL2irEFU2Pm1Q`, node `209:347`, registered as `reel-14-they-buy-from-you` v01. Copy “they buy / FROM YOU”, brand yellow, no period.

## Edit and local implementation

Preserved the approved paper collage, WhatsApp wallpaper, uneven paper bubble contours, neutral shadows, stepped entrances, squat from Reel 7, and correction question bubbles. Translated 40 title elements and English caption/chat copy, retimed through 90 shared boundaries to the actual English word timings, and fitted longer phrases to their existing bounds.

The optional `documentLabel` Studio property removes a hardcoded Spanish PDF label from the English paper chat. Its default remains `Documento`, preserving saved Spanish instances. The shared Document renderer accepts an optional label; paper-chat-stack exposes it through the existing registry/schema. No separate English-only rendering path.

English synchronized RAW replaces the base clip with the original 0–2177 frame window and English-only voice audio. Seven transparent foreground sequences were regenerated locally with Apple Vision from matching ranges of the English synchronized base, avoiding Spanish mouth shapes or stale source offsets. SFX remain separate, and the final mix applies a consistent 70% gain to all audible clips (voice 63%, preserving the existing voice/SFX balance) after the first AAC export measured peaks above full scale.

## Verification

- `npm run build`: passed.
- `npm test`: 139 passed, 0 failed, including default Spanish compatibility and editable English document label/schema coverage.
- Schema validation, all media source bounds, total duration, visible Spanish copy scan, and revision-safe final save passed.
- RAW frame alignment: compared unaffected hands/clothing at frames 112, 533, 809, 1166, 1747 and 2116 against original frames n−2…n+2. Every best match was offset 0; same-frame mean pixel error 1.10–1.64 versus much larger adjacent-frame errors.
- Foreground alignment: first/middle/last transparent PNG of each of seven sequences (21 checks) matched synchronized base n better than n−1 or n+1. Every best offset 0. Alpha edges excluded from numerical matching.
- Exercise cutout and white background each cover every frame from 1502 inclusive through 1696 exclusive exactly once. Chat split source clocks and event times share the retimed scene origin rather than restarting animation.
- Production Remotion stills reviewed for opening comment, title fit, paper delivery label, short explanation cues and correction composition. English cover export reviewed for fit.
- Chrome editor playback verified with audio-playing state; frame-step review at 1619, 1620 and 1622 confirmed the exercise remains visible across the explanation/correction boundary, without a flash of Lu.

Detailed local production evidence and scripts live in the English project's `english-production/` folder (`retiming-plan.json`, `raw-frame-alignment.json`, `depth-frame-alignment.json`, `text-fit-audit.json`, provider state and final-save evidence). No subjective listening assessment of emotion/naturalness is claimed: transcript meaning, signal diagnostics, actual playback state and visuals were reviewed, but the available tools do not supply perceived audio listening.

## Final review corrections

A native accessibility click on an offscreen timeline text item displaced “add those” from frame 1622 to 1294. The saved-project comparison caught it. Restored the authored start at 1622 using expected revision 2, then saved corrected revision 3 and opened a fresh editor instance. Library selection and keyboard stepping verified 1619/1622 and adjacent 1695/1696: the exercise persists until the intended return to Lu. The browser shows Saved locally, and a subsequent API comparison exactly matches the corrected export snapshot. Original Spanish remains revision 130 and exactly equals the baseline.

The first completed MP4 decoded all 2177 frames without errors, but audio peak 1.279 exceeded full scale. It is superseded. The final mix gain correction is in the editable project, rather than only a postprocessed deliverable. Three replacement local exports failed before rendering with a root-component delayRender timeout, including a retry after restarting the idle local server. A diagnostic with browser logs showed the bundle and registerRoot load, but the next animation-frame wait stalls in the installed Remotion Headless Shell. The same composition/still succeeds with the installed Google Chrome through Remotion’s supported browserExecutable/chromeMode options and an isolated temporary profile. The corrected MP4 and cover use that local Remotion configuration, the existing metadata finalizer and the standard completed-export manifest format. This avoids altering global settings or adding a product-specific renderer workaround. No further paid provider jobs were submitted.

## Completed deliverables

Final saved edit is revision 3. After proving the entire picture project equals the first completed full export (only audio gain and its caption-source signature differ), the finished H.264 stream was preserved without reencoding. The 11 audible clips were mixed afresh from their source media at 48 kHz stereo, retaining sample-aligned starts, source windows, playback rates and fades using the existing caption-engine mixing pattern. The corrected AAC mix was muxed with that unchanged picture and finalized through the existing export metadata helper. The redundant slower Chrome picture render was cancelled after this completed master passed verification. The approved English cover picture is unchanged and its completed export was retained as the companion.

- Completed export `1d512f63-f4c1-44f7-b86c-4d2e7b2a3079`, recognized by the editor's latest-export API and accompanied by its standard saved export manifest.
- MP4: `Reel-14-English-Final-2026-11-16T20-29-12-328Z.mp4`, 80,046,469 bytes, 1080×1920, 30 fps, exactly 2177 decoded video frames, no decode errors.
- Cover: `Reel-14-English-Final-2026-11-16T20-29-12-328Z-cover.png`.
- Final audio: 72.576 decoded seconds (AAC packet padding), peak 0.899256, mono diagnostic RMS −17.8126 dBFS. Below full scale.
- Video packet SHA-256 matches the original checked full render exactly: `9bc2a139bfc8129a75e59bbf0bbdde0168a8fb3d7165e1014637753c976dd4ef`. A complete framehash comparison also confirms all 2177 video packet hashes, DTS, PTS and durations are identical. No picture frames or timestamps were shifted during audio mastering.
- Final file SHA-256: `86176653c40a0d0ed7d528f12b29fb9fc4396b98c6e2e6c58347e0803005b126`.

Final mastered MP4 browser check: served only on localhost and opened in Chrome’s native video player. Play/pause, advancing opening/comment/chat picture and the Audio playing indicator were verified. The exact exercise/chat seam checks above were performed in the editable player; no additional claims about native scrubber precision are made. No subjective voice-emotion listening judgment is claimed.

The editor recognizes the final master as its latest completed MP4 with matching cover. Final project remains revision 3 after browser review; original Spanish remains unchanged. The Studio code change was committed/pushed as `316a398` on the existing non-deploying topic branch. Unrelated preexisting conversation-template work was excluded. No English social post was created; publication was outside this English-version request.
