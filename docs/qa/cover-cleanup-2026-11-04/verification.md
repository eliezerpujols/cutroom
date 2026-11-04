# Cover panel cleanup — November 4, 2026

- Removed “Choose a frame. Make it yours.” and its unused CSS. Cover frame controls now follow the heading with compact spacing.
- Shared TimeValue uses the existing text-spacing-input suffix pattern, placing seconds inside the filled field across cover frame, timing, audio fades and source offsets. Kept number input validation and cancellation; hid native spinners to leave room for the suffix.
- `npm run build` and `git diff --check` passed (existing bundle-size warning).
- Browser verified the sentence is absent and the s suffix bounds are inside the 72px input, with 23px right padding. Typed 1.5 then Escape restored 0.00 without committing.
- Local screenshot `cover.png` is ignored by Git. Global skill updated with the unit suffix and concise cover copy rule.
