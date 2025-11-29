# HouseParty Assets

This directory contains app icons, splash screens, and other visual assets.

## Required Assets for App Store Submission

### App Icon (icon.png)
- **Size**: 1024x1024px
- **Format**: PNG with transparency
- **Design**: Should represent the HouseParty brand
- **Current Status**: ⚠️ Placeholder (20 bytes) - NEEDS REPLACEMENT

### Splash Screen (splash.png)
- **Size**: 2048x2048px (will be scaled automatically)
- **Format**: PNG
- **Background**: Should match app.json backgroundColor (#0F172A)
- **Current Status**: ⚠️ Missing - NEEDS CREATION

### Favicon (favicon.png)
- **Size**: 48x48px or 32x32px
- **Format**: PNG
- **Purpose**: Web version tab icon
- **Current Status**: ⚠️ Placeholder (20 bytes) - NEEDS REPLACEMENT

## Design Guidelines

### Brand Colors
- Primary: #10B981 (Green)
- Dark Background: #0F172A
- Dark Secondary: #1E293B
- Text: #FFFFFF

### Icon Concept
The icon should represent:
- Houses/Communities
- Gaming/Competition
- Scorekeeping/Tracking
- Social connection

Suggested concepts:
1. House icon with trophy inside
2. Stylized "HP" monogram
3. Score counter with house silhouette
4. Game piece on house foundation

### Design Tools
To create proper assets, use:
- **Figma**: For design and export
- **Adobe Illustrator**: For vector graphics
- **Sketch**: For iOS-specific designs
- **Canva**: For quick mockups

## Generating Assets

### Using Figma/Adobe
1. Create 1024x1024px artboard for icon
2. Design with 10% padding on all sides
3. Export as PNG at 1x, 2x, 3x resolutions
4. Use Expo's asset generation: `npx expo-optimize`

### Using Asset Generator Tools
```bash
# Install expo-optimize
npm install -g sharp-cli

# Generate all sizes from source
npx expo-optimize
```

## Platform-Specific Requirements

### iOS
- No transparency in background
- Rounded corners applied automatically
- Requires multiple sizes (handled by Expo)

### Android
- Adaptive icon with foreground and background layers
- Background color: #0F172A (set in app.json)
- Foreground should work on any background

### Web
- Favicon for browser tabs
- PWA icons for home screen
- Social media preview image

## Testing Your Icons

Before submission:
1. Test on real devices (iOS & Android)
2. Check appearance in both light/dark modes
3. Verify readability at small sizes
4. Ensure consistency across platforms

## Updating Assets

After creating new assets:
1. Replace files in this directory
2. Run `npx expo-optimize` if needed
3. Clear cache: `npm start -- --clear`
4. Test on device/emulator
5. Update this README to mark as ✅ Complete
