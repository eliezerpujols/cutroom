# Two distinct GIFs on the requested track — 2026-11-06

An explicit drop that overlapped a clip previously used automatic overlap
separation, which sent the new GIF to a different track. Explicit library drops
now keep the selected lane. The clip start snaps to the closest free interval;
ties prefer the later interval. Existing clips, source media, duration, mute
state and layer order are preserved. Click insertion and ordinary timeline
overlap separation retain their automatic placement behavior.

The shared placement option is used by GIPHY, Media, Sounds and Studio. GIPHY
and Studio selection seeks to the resulting start after an adjusted drop.

Verification:

- `npm test`: 105 tests passed.
- `npm run build`: passed, with the existing bundle-size advisory.
- Unit regressions cover two distinct GIF asset IDs on one lane, touching edges,
  earlier/later nearest gaps, equal-distance ties and the last allowed start.
- HTTP regression imports two independently generated colored videos with
  distinct GIPHY source IDs, inserts both on one lane, and reads the saved
  project back. Both media references and the original clip remain intact.
- Native editor drag in isolated QA project
  `f28563c2-02e7-4c81-b337-0a88532f2ef2`: a red GIF was dropped over an occupied
  lane and appeared at frame 90, immediately after the original cyan GIF.
  Both remain on `v0`, and the project retains its 12 tracks. No provider
  search or paid generation was used.
