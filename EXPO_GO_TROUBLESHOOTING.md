# Expo Go QR Code Scanning Error - Troubleshooting Guide

## Problem Description
**Error**: `TypeError: createJob(...).run is not a function`

This error occurs when scanning the QR code from bolt.new in Expo Go, despite the Metro bundler showing successful bundling.

## Root Cause Analysis

### Primary Cause
The error is caused by a **Metro bundler minification issue** with the `metro-minify-terser` package. Specifically:

1. **Metro Bundler Configuration Mismatch**: The Metro bundler tries to call `.run()` on a job object that doesn't have this method in certain configurations
2. **Minifier Incompatibility**: The minifier configuration was too aggressive, causing the Metro bundler to fail when transforming code
3. **Babel Plugin Order**: The `react-native-worklets/plugin` was incorrectly specified instead of `react-native-reanimated/plugin`

### Why This Happens on bolt.new
- bolt.new uses a specific Metro bundler configuration for its cloud environment
- The default minification settings don't always work well with Expo Go's runtime
- The error manifests on mobile but not web because web uses a different bundler

## Solution Applied

### 1. Metro Configuration Fix
**File**: `metro.config.js`

**Changes Made**:
```javascript
// Simplified minifier config that avoids the problematic code path
config.transformer = {
  minifierPath: require.resolve('metro-minify-terser'),
  minifierConfig: {
    ecma: 8,
    keep_classnames: false,
    keep_fnames: false,
    module: true,
    mangle: { reserved: [] },
  },
};

// Clear cache to avoid stale transformations
config.cacheStores = [];
```

### 2. Babel Configuration Fix
**File**: `babel.config.js`

**Change Made**:
- Replaced `'react-native-worklets/plugin'` with `'react-native-reanimated/plugin'`
- This is the correct plugin for React Native Reanimated v4+

## Step-by-Step Resolution

### Step 1: Clear Metro Cache
```bash
# In bolt.new terminal, run:
npx expo start --clear

# Or if that doesn't work:
rm -rf node_modules/.cache
rm -rf .expo
```

### Step 2: Restart the Dev Server
1. Stop the current Metro bundler (Ctrl+C in terminal)
2. Run: `npm run dev`
3. Wait for "Metro waiting on..." message

### Step 3: Rescan QR Code
1. Open Expo Go app on your device
2. Scan the new QR code from the terminal
3. The app should now load successfully

### Step 4: If Still Failing
Try clearing Expo Go's cache:
1. In Expo Go app, shake device
2. Select "Clear cache and reload"
3. If that fails, uninstall and reinstall Expo Go app

## Prevention Tips

### 1. Always Use Correct Plugins
- For Reanimated v4+: Use `'react-native-reanimated/plugin'`
- For Reanimated v2-3: Use `'react-native-reanimated/plugin'`
- For Worklets: Only use if specifically needed and compatible

### 2. Metro Configuration Best Practices
```javascript
// Keep minifier config simple
minifierConfig: {
  ecma: 8,           // Modern JS target
  module: true,      // Enable module mode
  mangle: {          // Keep mangling simple
    reserved: []
  },
}
```

### 3. Regular Cache Clearing
When you encounter bundling errors:
1. First try: `npx expo start --clear`
2. Then try: Clear Expo Go cache in app
3. Last resort: Delete `node_modules` and reinstall

### 4. Check Compatibility
Before adding new packages:
- Check Expo SDK compatibility: https://docs.expo.dev/versions/latest/
- Verify React Native version compatibility
- Test on Expo Go before building custom dev client

## Alternative Testing Approaches

### Option 1: Use Expo Dev Client (Recommended)
```bash
# Build a development client
npx expo install expo-dev-client
npx eas build --profile development --platform android
npx eas build --profile development --platform ios

# Then run:
npx expo start --dev-client
```

**Benefits**:
- More reliable than Expo Go
- Supports all native modules
- Better debugging tools

### Option 2: Local Development Build
```bash
# For Android
npx expo run:android

# For iOS (requires Mac)
npx expo run:ios
```

**Benefits**:
- Fastest iteration cycle
- Direct device access
- Full native debugging

### Option 3: Web Testing First
```bash
npm run build:web
```

**Benefits**:
- Immediate testing
- No device needed
- Good for UI/UX validation

### Option 4: Expo Snack
1. Go to https://snack.expo.dev
2. Copy your code
3. Test in browser or Expo Go

## Understanding the Error

### What is `createJob(...).run`?
- `createJob` is a Metro bundler internal function
- It creates transformation jobs for JavaScript files
- `.run()` executes the transformation
- The error means the job object doesn't have a `.run()` method

### Why Metro Version Matters
Different Metro versions have different APIs:
- Metro 0.76+: Uses newer job API
- Metro 0.75-: Uses older job API
- Expo 54 expects Metro 0.81+

### The Minifier's Role
1. Metro transforms your code
2. Minifier compresses the transformed code
3. If minifier config is wrong, Metro can't create jobs properly
4. Result: `createJob(...).run is not a function`

## Common Related Errors

### "Invariant Violation: Failed to call into JavaScript module method"
**Solution**: Same as above - clear cache and check Babel config

### "Unable to resolve module"
**Solution**: Check imports and run `npm install`

### "Metro bundler has encountered an internal error"
**Solution**: Restart Metro with `--reset-cache`

## Quick Checklist

✅ Metro config uses correct minifier settings
✅ Babel config has correct Reanimated plugin
✅ Cache cleared with `--clear` flag
✅ QR code rescanned after changes
✅ Expo Go app is up to date
✅ Network connection is stable

## Still Having Issues?

### Check These:
1. **Expo Go Version**: Update to latest
2. **Node Version**: Use Node 18+ or 20+
3. **Network**: Ensure device and computer on same network
4. **Firewall**: Check if ports 8081, 19000-19006 are open

### Get Help:
- Expo Forums: https://forums.expo.dev
- Discord: https://chat.expo.dev
- GitHub Issues: https://github.com/expo/expo/issues

## Summary

The `createJob(...).run is not a function` error is a Metro bundler configuration issue. The fixes applied:
1. ✅ Simplified Metro minifier configuration
2. ✅ Fixed Babel plugin (worklets → reanimated)
3. ✅ Disabled Metro cache stores

**Next Steps**: Restart your dev server with `npm run dev` and rescan the QR code!
