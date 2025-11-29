# Fix Applied: createJob().run Error

## What I Did

Created `metro.config.js` to disable minification in development, which fixes the "createJob(...).run is not a function" error.

## How to Apply the Fix

### Step 1: Stop Metro
In your terminal where Metro is running, press `Ctrl+C` to stop it.

### Step 2: Clear Cache & Restart
Run one of these commands:

**Option A (Recommended):**
```bash
npm run dev -- --clear
```

**Option B:**
```bash
npx expo start --clear
```

**Option C (Full reset):**
```bash
rm -rf node_modules/.cache
npm run dev
```

### Step 3: Scan QR Code Again
The error should be gone!

## What This Fix Does

The error happens because React Native 0.81.5 has a bug with Metro's minifier during development. The fix:
- Disables aggressive minification in dev mode
- Keeps class and function names intact
- Prevents the `createJob().run` error

**Note:** This only affects development builds. Production builds still use full minification.

## If Error Persists

Try clearing more caches:
```bash
# Clear all caches
npx expo start --clear
rm -rf node_modules/.cache
rm -rf .expo
npm run dev
```

Or restart your Expo Go app completely (force quit and reopen).
