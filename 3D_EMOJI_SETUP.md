# 3D Emoji Setup Guide

This app uses **Microsoft Fluent 3D Emojis** to provide a premium, consistent visual experience across all devices. Follow this guide to download and install the emoji assets.

---

## Quick Start (5-10 minutes)

### Step 1: Create Assets Directory

```bash
mkdir -p assets/emojis/3d
```

### Step 2: Download Microsoft Fluent Emojis

**Option A: Download Pre-Exported PNGs (Recommended)**

Visit: https://github.com/microsoft/fluentui-emoji/tree/main/assets

1. Navigate to `3D/` folder
2. Download the entire folder or individual emoji PNGs you need
3. Each emoji has a folder named by its Unicode codepoint (e.g., `1f600` for 😀)
4. Inside each folder, use the `Color.png` file

**Option B: Clone the Full Repository**

```bash
git clone https://github.com/microsoft/fluentui-emoji.git
cd fluentui-emoji/assets/3D
```

### Step 3: Rename and Organize Emoji Files

The app expects simple, descriptive filenames. Here's the mapping:

#### Required Core Emojis (~50 most common)

```bash
# Houses & Buildings
🏠 → house.png
🏡 → house-with-garden.png
🏢 → office-building.png
🏥 → hospital.png

# Sports
⚽ → soccer.png
🏀 → basketball.png
🏈 → football.png
⚾ → baseball.png

# Gaming
🎮 → game-controller.png
🕹️ → joystick.png
🎯 → target.png
🎲 → dice.png

# Hearts
❤️ → red-heart.png
💔 → broken-heart.png
💕 → two-hearts.png

# Party
🎉 → party-popper.png
🎊 → confetti-ball.png
🎈 → balloon.png
🎁 → gift.png

# Trophies
🏆 → trophy.png
🥇 → gold-medal.png
🥈 → silver-medal.png
🥉 → bronze-medal.png

# Common Faces
😀 → grinning-face.png
😃 → smile.png
😄 → laugh.png
😊 → blush.png
😎 → cool.png
🥳 → party-face.png

# Hands
👍 → thumbs-up.png
👎 → thumbs-down.png
�� → clap.png
🙏 → pray.png

# And more...
```

### Step 4: Place Files in Correct Directory

Move all renamed PNG files to:

```
assets/emojis/3d/
├── house.png
├── soccer.png
├── trophy.png
├── red-heart.png
├── party-popper.png
└── ... (all other emojis)
```

---

## Automated Script (Optional)

Create a script to automate the renaming process:

**scripts/setup-emojis.sh:**

```bash
#!/bin/bash

# Path to Microsoft Fluent Emoji repo
FLUENT_REPO="./fluentui-emoji/assets/3D"
OUTPUT_DIR="./assets/emojis/3d"

mkdir -p $OUTPUT_DIR

# Example mappings (add more as needed)
cp "$FLUENT_REPO/1f600/Color.png" "$OUTPUT_DIR/grinning-face.png"
cp "$FLUENT_REPO/1f3e0/Color.png" "$OUTPUT_DIR/house.png"
cp "$FLUENT_REPO/26bd/Color.png" "$OUTPUT_DIR/soccer.png"
cp "$FLUENT_REPO/1f3c6/Color.png" "$OUTPUT_DIR/trophy.png"
cp "$FLUENT_REPO/2764-fe0f/Color.png" "$OUTPUT_DIR/red-heart.png"
cp "$FLUENT_REPO/1f389/Color.png" "$OUTPUT_DIR/party-popper.png"

echo "✅ 3D Emojis installed successfully!"
```

Run the script:

```bash
chmod +x scripts/setup-emojis.sh
./scripts/setup-emojis.sh
```

---

## Verification

After placing the emoji files, test the integration:

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Navigate to any screen with emojis:**
   - Create House screen
   - House Cards
   - Emoji Picker
   - Game screens

3. **Verify:**
   - ✅ 3D emojis display correctly
   - ✅ Unmapped emojis fall back to native Unicode
   - ✅ No console errors about missing assets

---

## Unicode to Filename Mapping Reference

The complete mapping is in `/lib/emojiMap.ts`. Here's how to find the codepoint for any emoji:

**Online Tools:**
- https://unicode-table.com/en/emoji/
- https://emojipedia.org/

**Example:**
- 😀 (Grinning Face) = Unicode `U+1F600` = Codepoint `1f600`
- In Fluent repo: `assets/3D/1f600/Color.png`
- In our app: `assets/emojis/3d/grinning-face.png`

---

## Full List of Emojis Used in App

See `/lib/emojiMap.ts` for the complete list of ~200 emojis used across all emoji packs.

Key categories:
- 🏠 **Houses & Buildings** (10 emojis)
- ⚽ **Sports** (12 emojis)
- 🎮 **Gaming** (10 emojis)
- 🦁 **Animals** (18 emojis)
- 🔥 **Energy & Effects** (10 emojis)
- 🌌 **Space & Cosmic** (6 emojis)
- 👻 **Creatures** (11 emojis)
- 🍕 **Food** (11 emojis)
- 🍎 **Fruits** (10 emojis)
- ❤️ **Hearts** (11 emojis)
- 🎵 **Music** (10 emojis)
- 🔮 **Mystic** (5 emojis)
- 🌲 **Nature** (12 emojis)
- 🎉 **Party** (8 emojis)
- And many more...

---

## File Size Considerations

- **Average PNG size:** ~20-50 KB per emoji
- **Total for 200 emojis:** ~5-10 MB
- **Impact on app bundle:** Acceptable for premium visual experience

**Optimization Tips:**
- Use only the emojis you actually need
- Consider compressing PNGs with tools like ImageOptim or TinyPNG
- Target: Keep under 15 MB total for all emoji assets

---

## Troubleshooting

### Emojis not displaying

1. **Check file paths:**
   ```bash
   ls assets/emojis/3d/
   ```

2. **Verify naming:**
   - Files must match names in `/lib/emojiMap.ts` exactly
   - Names are case-sensitive

3. **Check console for errors:**
   - Look for "Failed to load 3D asset" warnings

### Fallback to native emojis

If you see native Unicode emojis instead of 3D ones:
- The mapping might be missing in `/lib/emojiMap.ts`
- The PNG file might be missing or incorrectly named
- Check the browser/app console for warnings

### Build errors

If you get require() errors:
- Ensure all mapped files exist in `assets/emojis/3d/`
- Check that filenames have no typos
- Restart Metro bundler: `npm run dev` (or kill and restart)

---

## License & Attribution

Microsoft Fluent Emojis are licensed under the MIT License.
See `/FLUENT_EMOJI_LICENSE.md` for full license text and attribution.

**Credit:**
© Microsoft Corporation
https://github.com/microsoft/fluentui-emoji

---

## Next Steps

Once emojis are installed:

1. **Test thoroughly:**
   - Create a house and select different emoji packs
   - Navigate through all screens
   - Test on iOS, Android, and Web

2. **Optimize:**
   - Remove any unused emoji PNGs
   - Compress remaining images

3. **Enjoy!**
   Your app now has premium 3D emojis across all platforms!

---

## Questions?

Check:
- `/lib/emojiMap.ts` - Complete mapping reference
- `/components/Emoji3D.tsx` - Component implementation
- GitHub Issues: https://github.com/microsoft/fluentui-emoji/issues
