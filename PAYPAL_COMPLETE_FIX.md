# PayPal Purchase Flow - Complete Fix

## Problems Identified

### 1. Missing Authorization Token Error
**Problem**: The redirect Edge Function required JWT authentication, blocking PayPal's redirect
**Solution**: Deployed `paypal-deeplink-redirect` with `verify_jwt: false`

### 2. Invalid URL Placeholders
**Problem**: PayPal rejected return URLs containing `{orderId}` and `{token}` placeholders
**Error**: `INVALID_PARAMETER_SYNTAX` from PayPal API
**Solution**: Removed placeholders - PayPal automatically appends `?token=ORDER_ID` to the return URL

### 3. Mobile Deep Link Not Working
**Problem**: Automatic redirects from mobile browsers don't trigger deep links
**Symptom**: Users see HTML/CSS code on screen instead of being redirected to app
**Solution**: Added manual "Open HouseParty App" button that appears after 1 second

## Changes Made

### Edge Function: paypal-deeplink-redirect
- Deployed with `verify_jwt: false` (no authentication required)
- Added iframe + window.location dual redirect approach
- Shows manual button after 1 second for user to tap
- Better mobile-friendly UI with clear call-to-action

### Edge Function: paypal-create-premium-order
- Changed return URL from: `${redirectBaseUrl}?orderId={orderId}`
- To: `${redirectBaseUrl}` (clean URL, PayPal adds token automatically)

### Edge Function: create-kit-paypal-order
- Changed return URL from: `${redirectBaseUrl}?kitId=${kit.id}&token={token}`
- To: `${redirectBaseUrl}?kitId=${kit.id}` (PayPal adds token automatically)

## How It Works Now

1. **User clicks Purchase**
   - App calls order creation Edge Function
   - Gets back PayPal approval URL
   - Opens PayPal checkout

2. **User completes PayPal payment**
   - PayPal redirects to: `https://[supabase]/functions/v1/paypal-deeplink-redirect?token=ORDER_ID&kitId=KIT_ID`
   - No authentication required (public function)

3. **Redirect page loads**
   - Shows "Payment Complete!" message
   - Tries automatic redirect via iframe + window.location
   - After 1 second, shows manual button: "Open HouseParty App"
   - Button uses deep link: `houseparty://paypal/success?token=ORDER_ID&kitId=KIT_ID`

4. **User taps button (or auto-redirect works)**
   - App opens to `app/paypal/success.tsx`
   - Extracts token and kitId
   - Calls capture Edge Function with user's auth token
   - Records purchase in database
   - Shows success message
   - Redirects to appropriate screen

## Testing Instructions

1. Go to Shop tab in the app
2. Try to purchase Premium or a paid kit
3. Complete the PayPal checkout process
4. After completing payment:
   - You'll see a purple gradient page saying "Payment Complete!"
   - After 1 second, a button appears: "Open HouseParty App"
   - **Tap this button** to return to the app
   - The app will process the payment and redirect you

## Why The Manual Button Is Needed

Mobile browsers (especially on Android/iOS) block automatic deep link redirects for security reasons. Users must actively tap a link to trigger a deep link. This is standard behavior across all mobile apps - you can't force-redirect to an app without user action.

The automatic redirect attempt is still included for desktop/web browsers where it works, but mobile users will always need to tap the button.

## Deep Link Configuration

The app is properly configured to handle `houseparty://paypal/*` deep links:
- iOS: Registered in `CFBundleURLTypes` (app.json line 30-34)
- Android: Registered in `intentFilters` (app.json line 69-81)

## Notes

- The redirect function is now public (no auth) which is safe since it only redirects and doesn't access any data
- PayPal automatically adds the `token` parameter to return URLs
- The manual button is a standard pattern for mobile deep linking
- All functions include comprehensive logging for debugging
