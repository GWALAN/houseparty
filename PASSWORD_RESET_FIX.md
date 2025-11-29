# Password Reset Deep Link Fix

## Problem
Password reset emails were opening Bolt's web preview URL which doesn't work on mobile devices, leaving users stuck on a Chrome error page with no way to reset their password.

## Root Cause
- Supabase requires HTTPS URLs for password reset redirects
- The Bolt preview URL doesn't work on mobile browsers
- Direct deep links (`houseparty://`) aren't allowed by Supabase

## Solution
Created a Supabase Edge Function that acts as a bridge between Supabase's HTTPS requirement and the app's deep link.

### Components

#### 1. Edge Function: `auth-deeplink-redirect`
- **Location**: `supabase/functions/auth-deeplink-redirect/index.ts`
- **URL**: `https://qqeccmwtvjjysypahgkn.supabase.co/functions/v1/auth-deeplink-redirect`
- **Purpose**: Receives password reset tokens from Supabase and creates a mobile-friendly HTML page

**Features**:
- Extracts `access_token`, `refresh_token`, and `type` from URL params or hash
- Automatically attempts to open app via deep link
- Shows a manual "Open HouseParty App" button after 2 seconds
- Provides clear instructions if automatic redirect fails
- Returns proper error pages for invalid/expired links

#### 2. Updated AuthContext
- **File**: `contexts/AuthContext.tsx`
- Changed redirect URL from Bolt preview to edge function
- Now uses: `https://qqeccmwtvjjysypahgkn.supabase.co/functions/v1/auth-deeplink-redirect`

#### 3. Enhanced auth-redirect Screen
- **File**: `app/auth-redirect.tsx`
- Added manual button UI for web platform
- Shows clear instructions after 1.5 seconds
- Better error handling and user feedback

#### 4. Updated Forgot Password Screen
- **File**: `app/(auth)/forgot-password.tsx`
- Clearer success message explaining the flow
- Sets proper user expectations

#### 5. Existing Deep Link Handler
- **File**: `lib/deepLinking.ts`
- Already configured to handle `houseparty://reset-password` deep links
- Parses tokens and navigates to reset-password screen

## User Flow

1. **User requests password reset** in the app
2. **Supabase sends email** with link to edge function
3. **User clicks email link** (opens in default browser/Gmail app)
4. **Edge function loads** an HTML page that:
   - Automatically tries to open: `houseparty://reset-password?access_token=...`
   - Shows a spinner for 2 seconds
   - Then shows a big green "Open HouseParty App" button
   - Provides step-by-step instructions
5. **User taps button** (or app opens automatically)
6. **App opens** to reset-password screen with session set
7. **User enters new password** and completes reset

## Configuration Required

### Supabase Dashboard (Optional but Recommended)
Go to: Authentication → URL Configuration

Add to **Redirect URLs allowlist**:
- `https://qqeccmwtvjjysypahgkn.supabase.co/functions/v1/auth-deeplink-redirect`

This ensures Supabase accepts the edge function as a valid redirect target.

## Testing

1. Open the app
2. Go to "Forgot Password"
3. Enter your email
4. Check email inbox
5. Click the reset link
6. Browser opens showing "Opening HouseParty..."
7. After 2 seconds, see the "Open HouseParty App" button
8. Tap the button
9. App should open to reset password screen
10. Enter new password successfully

## Advantages

1. **Works on all mobile browsers** (Chrome, Gmail app, Safari, etc.)
2. **No custom domain required** (uses Supabase edge function URL)
3. **Clear user instructions** if automatic redirect fails
4. **Proper error handling** for expired/invalid links
5. **Professional UI** matching app design
6. **No configuration changes** needed in Supabase (though recommended)

## Edge Cases Handled

- **Tokens in URL params**: Extracted correctly
- **Tokens in hash fragment**: Parsed from `#access_token=...`
- **Missing tokens**: Shows error page
- **Expired tokens**: Supabase handles validation
- **App not installed**: Instructions to manually open app
- **Browser blocks deep link**: Manual button provided
- **Unknown auth type**: Returns 400 error

## Files Changed

1. `supabase/functions/auth-deeplink-redirect/index.ts` (created)
2. `contexts/AuthContext.tsx` (updated redirect URL)
3. `app/auth-redirect.tsx` (enhanced UI for manual redirect)
4. `app/(auth)/forgot-password.tsx` (updated instructions)

## Status

✅ Edge function deployed
✅ Redirect URL updated in app
✅ Deep link handler already configured
✅ UI enhanced for better UX
✅ Instructions updated for users

The password reset flow should now work reliably on mobile devices!
