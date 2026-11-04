# Preserve Effects during selection — November 4, 2026

- Timeline selection, direct text selection and direct caption selection preserve the Effects library tab when it is active. The selected target and right inspector still update.
- Explicit tool navigation and caption style actions still navigate normally. Outside Effects, selecting text/captions retains existing automatic navigation.
- `npm run build` and `git diff --check` passed (existing bundle-size warning).
- Browser verified timeline text, preview caption, preview text and mixed text/caption selection all keep Effects mounted and visible. Verified Media → selecting text still opens Text.
- Independent QA project; no saved project edits. Local screenshot `effects-text.png` is ignored by Git.
- Added this interaction rule to the globally linked Cutroom skill.
