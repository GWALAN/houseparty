# PayPal HTML Redirect Implementation - Complete Fix

## Overview

This document outlines the complete PayPal integration fix implementing the **HTML redirect approach** for all devices (iOS, Android, Web).

## Why HTML Redirect?

Based on your conversation with ChatGPT, you chose HTML redirect because:

1. **PayPal Requires HTTPS URLs**: PayPal doesn't accept custom URL schemes (like `houseparty://`) directly
2. **Works on All Devices**: The HTML redirect page works consistently across iOS, Android, and Web
3. **Better User Experience**: Shows a nice loading page while redirecting back to the app
4. **No Platform-Specific Code**: One solution works everywhere

## Changes Made

### 1. Fixed `create-kit-paypal-order` Edge Function

**File**: `supabase/functions/create-kit-paypal-order/index.ts`

**Change**: Updated return/cancel URLs to use HTML redirect function instead of hardcoded Expo dev URLs

```typescript
// BEFORE (hardcoded - won't work in production):
return_url: `https://k19dq4uq4ykb7hv.boltexpo.dev/paypal-success?kitId=${kit.id}`,
cancel_url: 'https://k19dq4uq4ykb7hv.boltexpo.dev/paypal-cancel',

// AFTER (HTML redirect function):
const redirectBaseUrl = `${supabaseUrl}/functions/v1/paypal-deeplink-redirect`;
return_url: `${redirectBaseUrl}?kitId=${kit.id}`,
cancel_url: `${redirectBaseUrl}?cancel=true`,
```

### 2. Updated Success Page to Use Correct Endpoint

**File**: `app/paypal/success.tsx`

**Change**: Updated to call `capture-kit-paypal-payment` instead of old `paypal-capture-order`

```typescript
// BEFORE:
const endpoint = kitIdParam
  ? 'paypal-capture-order'
  : 'paypal-capture-premium-order';

// AFTER:
const endpoint = kitIdParam
  ? 'capture-kit-paypal-payment'
  : 'paypal-capture-premium-order';
```

### 3. Updated App Configuration for Deep Links

**File**: `app.json`

**Changes Made**:

#### iOS Configuration
Added `CFBundleURLTypes` to handle the `houseparty://` scheme:

```json
"infoPlist": {
  "CFBundleURLTypes": [
    {
      "CFBundleURLSchemes": ["houseparty"]
    }
  ]
}
```

#### Android Configuration
Added intent filter for PayPal deep links:

```json
"intentFilters": [
  {
    "action": "VIEW",
    "data": [
      {
        "scheme": "houseparty",
        "host": "paypal"
      }
    ],
    "category": [
      "BROWSABLE",
      "DEFAULT"
    ]
  }
]
```

## How It Works

### Complete Payment Flow

```
1. User clicks "Purchase" in app
   ↓
2. App calls create-kit-paypal-order edge function
   ↓ (checks user_kit_purchases, creates PayPal order)
   ↓
3. App receives orderId and approvalUrl
   ↓
4. App opens PayPal checkout in browser/WebView
   ↓
5. User completes payment on PayPal
   ↓
6. PayPal redirects to: https://your-project.supabase.co/functions/v1/paypal-deeplink-redirect?kitId=XXX
   ↓
7. HTML redirect page loads with nice UI
   ↓
8. JavaScript automatically redirects to: houseparty://paypal/success?token=XXX&kitId=YYY
   ↓
9. App catches deep link and opens /app/paypal/success.tsx
   ↓
10. Success page calls capture-kit-paypal-payment edge function
   ↓ (captures PayPal payment, inserts into user_kit_purchases)
   ↓ (trigger adds kit to user_house_kits)
   ↓
11. App shows success message and redirects to shop
```

## Edge Functions Used

### For Kit Purchases:
- **Create Order**: `create-kit-paypal-order`
- **Capture Payment**: `capture-kit-paypal-payment`
- **HTML Redirect**: `paypal-deeplink-redirect`

### For Premium Purchases:
- **Create Order**: `paypal-create-premium-order`
- **Capture Payment**: `paypal-capture-premium-order`
- **HTML Redirect**: `paypal-deeplink-redirect`

## Deep Link Routes

The app handles these deep links:

- `houseparty://paypal/success?token=XXX&kitId=YYY` → `/app/paypal/success.tsx`
- `houseparty://paypal/cancel` → `/app/paypal/cancel.tsx`

## Database Tables Involved

### Kit Purchases:
1. **user_kit_purchases**: Records the purchase
2. **user_house_kits**: Unlocked via trigger when purchase completes
3. **house_kits**: Master table of available kits

### Premium Purchases:
1. **user_purchases**: Records premium purchase

## Testing Checklist

- [ ] Test kit purchase on iOS
- [ ] Test kit purchase on Android
- [ ] Test kit purchase on Web
- [ ] Test premium purchase on iOS
- [ ] Test premium purchase on Android
- [ ] Test premium purchase on Web
- [ ] Test cancel flow on all platforms
- [ ] Verify redirect function is deployed
- [ ] Verify all edge functions are deployed
- [ ] Test with real PayPal sandbox account

## Deployment Steps

### 1. Deploy Edge Functions

```bash
# Deploy all PayPal functions
npx supabase functions deploy create-kit-paypal-order
npx supabase functions deploy capture-kit-paypal-payment
npx supabase functions deploy paypal-create-premium-order
npx supabase functions deploy paypal-capture-premium-order
npx supabase functions deploy paypal-deeplink-redirect
```

### 2. Set Supabase Secrets

```bash
npx supabase secrets set PAYPAL_CLIENT_ID=your_client_id
npx supabase secrets set PAYPAL_SECRET=your_secret
npx supabase secrets set PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
```

### 3. Rebuild App

For the app.json changes to take effect, you need to rebuild:

```bash
# For development
npx expo prebuild

# For production
eas build --platform all
```

## Important Notes

1. **HTML Redirect is Required**: Don't remove or modify the `paypal-deeplink-redirect` function - it's essential for the flow to work

2. **Deep Link Scheme**: The app uses `houseparty://` as the URL scheme, configured in app.json

3. **Platform Differences**:
   - **Web**: Uses `window.location.href` for redirect
   - **Native**: Uses `WebBrowser.openAuthSessionAsync()` and deep links

4. **Sandbox vs Production**: Change `PAYPAL_BASE_URL` to production URL when going live:
   - Sandbox: `https://api-m.sandbox.paypal.com`
   - Production: `https://api-m.paypal.com`

## Troubleshooting

### Deep Link Not Working

1. Check app.json has correct configuration
2. Rebuild the app after changing app.json
3. Verify the scheme `houseparty://` matches in all places

### Redirect Function Not Found

1. Verify it's deployed: `npx supabase functions list`
2. Check URL in edge functions is correct
3. Deploy if missing: `npx supabase functions deploy paypal-deeplink-redirect`

### Payment Capture Fails

1. Check Supabase logs: `npx supabase functions logs capture-kit-paypal-payment`
2. Verify PayPal secrets are set correctly
3. Ensure user is authenticated (JWT token is valid)

## Summary

The PayPal integration now uses the **HTML redirect approach** consistently across all purchase types and all platforms. This provides a reliable, cross-platform solution that works with PayPal's HTTPS URL requirements while maintaining a seamless user experience.

All edge functions are properly configured to use the redirect function, and the app is configured to handle the deep links on both iOS and Android.
