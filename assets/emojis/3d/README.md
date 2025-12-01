# 3D Emoji Assets Directory

This folder contains Microsoft Fluent 3D emoji PNG files used throughout the app.

## Setup Required

**Important:** You need to download and place emoji PNG files in this directory before the 3D emojis will work.

## Quick Setup

1. **Read the setup guide:** `/3D_EMOJI_SETUP.md` in the project root
2. **Download emojis:** https://github.com/microsoft/fluentui-emoji
3. **Place PNGs here** with the correct filenames (see mapping in `/lib/emojiMap.ts`)

## Expected Files

This directory should contain approximately 200 PNG files with names like:

```
house.png
soccer.png
trophy.png
red-heart.png
party-popper.png
... and more
```

## Fallback Behavior

If a PNG file is missing, the app will automatically fall back to displaying the native Unicode emoji character. No crashes or errors will occur.

## File Naming

All filenames must match the mapping defined in `/lib/emojiMap.ts`.

Example:
- Emoji: 🏠
- Filename: `house.png`
- Used in: House cards, emoji packs, etc.

## License

All emoji files in this directory are from Microsoft Fluent Emoji and are licensed under the MIT License.

See `/FLUENT_EMOJI_LICENSE.md` for full license information.

---

**Need help?** See the complete setup guide: `/3D_EMOJI_SETUP.md`
