# Persistent Authentication Guide

## Overview

The app now implements **persistent authentication** using `expo-secure-store`. Users will stay logged in even after:
- Closing the app
- Restarting their device
- App updates

## How It Works

### 1. Secure Storage Adapter

The Supabase client uses `expo-secure-store` to securely store authentication tokens:

```typescript
// lib/supabase.ts
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
```

### 2. Platform-Specific Storage

- **iOS/Android**: Uses the native secure keychain (Keychain on iOS, EncryptedSharedPreferences on Android)
- **Web**: Falls back to `localStorage` for browser sessions

### 3. Automatic Token Refresh

Supabase automatically refreshes the authentication token before it expires:

```typescript
auth: {
  storage: ExpoSecureStoreAdapter,
  autoRefreshToken: true,      // ✅ Refreshes tokens automatically
  persistSession: true,         // ✅ Saves session to storage
  detectSessionInUrl: false,
}
```

### 4. Session Restoration on App Launch

When the app starts:
1. The `AuthContext` loads the session from secure storage
2. If a valid session exists, the user is automatically logged in
3. If no session or expired, the user is redirected to the login screen

## User Experience

### First Time Login
1. User enters credentials and signs in
2. Session is stored securely
3. User is redirected to the app

### Subsequent App Launches
1. App checks for stored session
2. If valid, user goes directly to the app (no login needed)
3. If expired or missing, user sees the login screen

### Token Refresh (Automatic)
- Happens in the background, before token expires
- User never notices - they stay logged in seamlessly
- Logged in console: `[AUTH] 🔄 Token refreshed automatically`

### Sign Out
- User explicitly signs out
- Session is removed from secure storage
- User is redirected to welcome screen

## Console Logs

You can monitor authentication status in the console:

```
[AUTH] Initializing auth context...
[AUTH] ✅ Session restored from storage - User is still logged in
[AUTH] User ID: 12345678-1234-1234-1234-123456789abc
[AUTH] Session expires at: 1/11/2025, 8:00:00 PM

// Later, when token needs refresh:
[AUTH] Auth state changed: TOKEN_REFRESHED
[AUTH] 🔄 Token refreshed automatically - session kept alive
[AUTH] New expiration: 1/11/2025, 9:00:00 PM
```

## Security Notes

### Storage Security

- **iOS**: Tokens stored in the iOS Keychain with hardware encryption
- **Android**: Tokens stored using EncryptedSharedPreferences with AES encryption
- **Web**: Tokens stored in localStorage (less secure, but standard for web apps)

### Token Lifetime

- Default token lifetime: **1 hour**
- Auto-refresh starts: **5 minutes before expiration**
- Refresh token lifetime: **30 days** (configurable in Supabase dashboard)

### Best Practices

1. **Never log out users manually** unless they request it
2. **Trust the automatic refresh** - it handles token expiration
3. **Handle network errors gracefully** - temporary offline doesn't mean logged out
4. **Clear sessions on sign out** - properly clean up when users log out

## Troubleshooting

### User Says "I Keep Getting Logged Out"

Check these:
1. Are they force-closing the app frequently?
2. Is SecureStore working? (Check device compatibility)
3. Are network requests failing during token refresh?
4. Is the refresh token expired (after 30 days of no use)?

### User Can't Log In After Update

- Clear app cache/data and try again
- Check if Supabase credentials are correct
- Verify network connectivity

### Testing Persistent Sessions

1. Sign in to the app
2. Force close the app completely
3. Reopen the app
4. You should be automatically logged in (no login screen)

## Related Files

- `lib/supabase.ts` - Supabase client configuration with SecureStore adapter
- `contexts/AuthContext.tsx` - Auth state management and session restoration
- `app/index.tsx` - Initial routing based on auth state
- `hooks/useFrameworkReady.ts` - Ensures app is ready before rendering
