# Mobile Build Guide - Fixing Expo Go Limitations

## Overview

This guide explains why certain features don't work in **Expo Go** and how to build a **development build** or **production build** to enable full functionality.

---

## Issues in Expo Go

### 1. ❌ Image Upload Not Working

**Problem**: Premium users cannot upload profile pictures from their device gallery when using Expo Go.

**Root Cause**:
- `expo-image-picker` requires native permissions and capabilities
- Expo Go has limited native module support
- File system access is restricted in Expo Go

**Solution**: Build a custom development build or production build.

---

### 2. ❌ PayPal Redirect Loop

**Problem**: After completing PayPal payment, the browser gets stuck in a refresh loop instead of redirecting back to the app.

**Root Cause**:
- Deep linking with custom URL schemes (`houseparty://`) requires native configuration
- Expo Go doesn't support custom URL schemes for OAuth/payment callbacks
- The app needs to register URL schemes at the native level

**Solution**: Build a custom development build or production build with proper deep linking configured.

---

## ✅ The Fix: Build a Development or Production Build

### Option 1: Development Build (Recommended for Testing)

A development build is like Expo Go but with your app's native code included.

#### Prerequisites
- Install EAS CLI: `npm install -g eas-cli`
- Login to Expo: `eas login`

#### Build for iOS (Simulator)
```bash
eas build --profile development --platform ios
```

#### Build for Android (Emulator or Device)
```bash
eas build --profile development --platform android
```

#### Install and Run
1. Download the build from the EAS dashboard
2. Install on your device/simulator
3. Run: `npx expo start --dev-client`

---

### Option 2: Production Build (For App Store Submission)

#### Build for iOS
```bash
eas build --profile production --platform ios
```

#### Build for Android
```bash
eas build --profile production --platform android
```

---

## What Gets Fixed?

### ✅ Image Upload Will Work
- Full file system access
- Native image picker with proper permissions
- Supabase storage uploads function correctly
- Users can upload profile pictures from gallery or camera

### ✅ PayPal Deep Linking Will Work
- Custom URL scheme `houseparty://` is registered
- PayPal can redirect back to app after payment
- No more refresh loops
- Seamless payment flow:
  1. User clicks "Purchase"
  2. Opens PayPal in browser
  3. Completes payment
  4. **Automatically redirects back to app**
  5. Payment confirmed and item unlocked

---

## Configuration Already in Place

The app is already configured with:

### ✅ Deep Linking Setup
```json
// app.json
{
  "expo": {
    "scheme": "houseparty",
    "ios": {
      "bundleIdentifier": "com.houseparty.scoretracker"
    },
    "android": {
      "package": "com.houseparty.scoretracker"
    }
  }
}
```

### ✅ Image Picker Permissions
```json
{
  "plugins": [
    [
      "expo-image-picker",
      {
        "photosPermission": "Allow HouseParty to access your photos",
        "cameraPermission": "Allow HouseParty to take photos"
      }
    ]
  ]
}
```

### ✅ PayPal Return URLs
```typescript
// PayPal order includes:
return_url: 'houseparty://paypal/success?kitId={kitId}'
cancel_url: 'houseparty://paypal/cancel'
```

### ✅ Deep Link Handlers
- `app/paypal-success.tsx` - Handles successful payments
- `app/paypal-cancel.tsx` - Handles cancelled payments

---

## Testing the Fixes

### Test Image Upload
1. Build development build
2. Install on device
3. Go to Profile → Camera icon
4. Select "Upload from Gallery" (Premium required)
5. Choose an image
6. ✅ Image uploads successfully

### Test PayPal Payment
1. Build development build
2. Install on device
3. Go to Shop or Profile → Upgrade
4. Click "Purchase"
5. Complete payment in browser
6. ✅ Browser closes and redirects to app
7. ✅ Payment confirmed automatically
8. ✅ Premium/Kit unlocked

---

## EAS Build Configuration

The project includes `eas.json` for build configuration:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

---

## Common Issues

### "Build failed with native dependencies"
- Solution: Make sure all packages in `package.json` are compatible
- Check: `npx expo-doctor`

### "Deep links not working after build"
- Solution: Uninstall old app completely before installing new build
- iOS: May need to restart device after install

### "Permissions not showing"
- Solution: Uninstall app, reinstall, and grant permissions when prompted

---

## Quick Start Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Create development build for testing
eas build --profile development --platform all

# Start development server
npx expo start --dev-client

# Create production builds for App Store/Play Store
eas build --profile production --platform all
```

---

## Summary

**Expo Go**: Quick testing, but limited features
**Development Build**: Full features, fast iteration
**Production Build**: App store ready

Both image uploads and PayPal redirects **will work perfectly** once you build a development or production build. The code is already fixed and ready! 🎉
