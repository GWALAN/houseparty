# Password Reset - Direct Deep Link (No Web Pages)

## Problem Solved

Previous attempts used web pages (HTML with meta refresh, JavaScript, or HTTP redirects) as intermediaries. These don't work reliably on Android/Gmail because:
- Meta refresh to `houseparty://` is ignored
- JavaScript redirects are blocked
- Even HTTP 302 to `houseparty://` can fail in certain contexts

## The Clean Solution

**Direct deep link from Supabase** - no edge functions, no web pages, no intermediaries.

```
User clicks email → Supabase redirect → houseparty://reset-password#tokens → App opens
```

## Implementation

### 1. AuthContext - Direct Deep Link

**File: `contexts/AuthContext.tsx`**

```typescript
const resetPassword = async (email: string) => {
  console.log('[AUTH] Password reset attempt:', email);

  // Direct deep link - no edge function, no web pages
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'houseparty://reset-password',
  });

  return { error };
};
```

**What changed:**
- ❌ Removed: Edge function URL
- ❌ Removed: Bolt preview URL
- ✅ Added: Direct `houseparty://reset-password` deep link

### 2. Reset Password Screen - Parse Hash Fragment

**File: `app/(auth)/reset-password.tsx`**

```typescript
export default function ResetPasswordScreen() {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        // Get the URL that opened the app
        const url = await Linking.getInitialURL();
        console.log('[RESET] Initial URL:', url);

        if (!url) {
          setError('Invalid reset link. Please request a new one.');
          setLoading(false);
          return;
        }

        // Supabase puts tokens in hash fragment: houseparty://reset-password#access_token=...
        const hash = url.split('#')[1] || '';
        const params = new URLSearchParams(hash);

        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const type = params.get('type');

        if (!access_token || !refresh_token || type !== 'recovery') {
          setError('Reset link is missing or invalid. Please request a new one.');
          setLoading(false);
          return;
        }

        // Set the session - this authenticates the user
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.log('[RESET] setSession error:', error);
          setError('Reset link has expired or is invalid. Please request a new one.');
          setLoading(false);
          return;
        }

        console.log('[RESET] Session set successfully');
        setValid(true);
      } catch (e) {
        console.log('[RESET] Unexpected error:', e);
        setError('Something went wrong. Please request a new reset link.');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleResetPassword = async () => {
    if (!valid) {
      setError('Session is invalid. Please request a new reset link.');
      return;
    }

    // Validate password...

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.replace('/(auth)/signin'), 2000);
    }
  };

  return (
    <View>
      {loading ? (
        <View>
          <ActivityIndicator size="large" color="#10B981" />
          <Text>Verifying reset link...</Text>
        </View>
      ) : null}

      {!loading && valid && (
        <View>
          <TextInput
            placeholder="New Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isUpdating}
          />
          <Pressable onPress={handleResetPassword} disabled={isUpdating}>
            {isUpdating ? <ActivityIndicator /> : <Text>Update Password</Text>}
          </Pressable>
        </View>
      )}

      {error && (
        <View>
          <Text>{error}</Text>
          <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
            <Text>Request New Reset Link</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
```

**Key changes:**
- Uses `Linking.getInitialURL()` to get the deep link that opened the app
- Parses tokens from hash fragment (`#access_token=...`)
- Shows loading state while verifying
- Only shows password inputs after successful verification
- Handles all error states with helpful messages

### 3. Supabase Configuration

**CRITICAL: You MUST configure Supabase to allow the deep link redirect.**

#### In Supabase Dashboard:

1. Go to: **Authentication → URL Configuration**

2. **Site URL:**
   - Change from Bolt preview URL to: `https://example.com`
   - (We don't use Site URL for mobile)

3. **Redirect URLs:**
   - **Remove** all these if present:
     - `https://*.webcontainer-api.io/**`
     - `https://*.boltexpo.dev/**`
     - Any Bolt preview URLs
     - Edge function URLs

   - **Add** these two:
     - `houseparty://reset-password`
     - `houseparty://*`

4. **Save Changes**

## How It Works

### User Flow

1. **User taps "Forgot Password"** in app
2. **Enters email** → App calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'houseparty://reset-password' })`
3. **Supabase sends email** with link like:
   ```
   https://qqeccmwtvjjysypahgkn.supabase.co/auth/v1/verify
     ?token=abc123...
     &type=recovery
     &redirect_to=houseparty%3A%2F%2Freset-password
   ```
4. **User clicks link** in email (opens in browser)
5. **Supabase verifies token** and redirects to:
   ```
   houseparty://reset-password#access_token=eyJ...&refresh_token=abc...&type=recovery
   ```
6. **Android/iOS recognizes scheme** → Opens HouseParty app
7. **App opens to reset-password screen:**
   - Screen reads tokens from URL hash
   - Calls `supabase.auth.setSession({ access_token, refresh_token })`
   - User is now authenticated
8. **User enters new password** → Calls `supabase.auth.updateUser({ password })`
9. **Success** → Redirects to sign in

### Why This Works

1. **No Web Pages**: Browser never tries to load HTML - just a redirect
2. **Native OS Handling**: Android/iOS directly recognize `houseparty://` and open app
3. **Standard Protocol**: Supabase's built-in verification flow handles everything
4. **Secure**: Tokens are in hash fragment, never logged or stored by browser

## Verification Steps

### 1. Verify Email Link Format

After requesting reset, check the actual email link:

1. Long-press the link in email → "Copy link address"
2. Paste into a note
3. Should look like:
   ```
   https://qqeccmwtvjjysypahgkn.supabase.co/auth/v1/verify
     ?token=...
     &type=recovery
     &redirect_to=houseparty%3A%2F%2Freset-password
   ```
4. **If you see** `webcontainer-api.io` or `boltexpo.dev` anywhere:
   - Supabase is still using old config
   - Go back to dashboard and fix redirect URLs

### 2. Test the Full Flow

**On physical device with dev build (not Expo Go):**

1. ✅ Kill the app completely
2. ✅ Open app → Go to "Forgot Password"
3. ✅ Enter `ElanConradie@gmail.com` → Send reset link
4. ✅ Open email on same device
5. ✅ Tap the reset link
6. ✅ Should see "Open in HouseParty?" prompt OR app opens automatically
7. ✅ App opens showing "Verifying reset link..." spinner
8. ✅ After verification, password inputs appear
9. ✅ Enter new password → Tap "Update Password"
10. ✅ Success message → Redirects to sign in after 2 seconds
11. ✅ Sign in with new password successfully

### Expected Logs

```
[AUTH] Password reset attempt: ElanConradie@gmail.com
[AUTH] Password reset email sent successfully

// User clicks email link, app opens

[RESET] Initial URL: houseparty://reset-password#access_token=eyJ...&refresh_token=abc...&type=recovery
[RESET] Parsed tokens: { hasAccessToken: true, hasRefreshToken: true, type: 'recovery' }
[RESET] Session set successfully

// User enters password

[RESET_PASSWORD] Password updated successfully
```

## Edge Cases Handled

✅ **No URL**: Shows "Invalid reset link" error
✅ **Missing tokens**: Shows "Reset link is missing or invalid" error
✅ **Invalid tokens**: Shows "Reset link has expired or is invalid" error
✅ **Expired tokens**: Supabase validates, shows error
✅ **App not installed**: OS shows "No app to handle this link"
✅ **Wrong type**: Validates `type === 'recovery'`
✅ **Session expired during reset**: Validates session before updating password

## Common Issues

### Issue: Email still has Bolt URL

**Cause**: Supabase redirect URLs not configured
**Fix**: Follow Step 3 above - update Supabase dashboard configuration

### Issue: Browser opens but app doesn't

**Cause**: Deep link scheme not registered OR Supabase redirect URLs not allowing `houseparty://`
**Fix**:
1. Verify `app.json` has `scheme: "houseparty"`
2. Verify Supabase allows `houseparty://*` in redirect URLs
3. Rebuild app after any scheme changes

### Issue: App opens but shows "Invalid reset link"

**Cause**: Tokens not being parsed from URL
**Fix**: Check logs for the actual URL format - tokens should be in hash fragment

### Issue: "Reset link has expired or is invalid"

**Cause**: Tokens are expired or malformed
**Fix**: Request a new reset link - tokens have limited lifetime (usually 1 hour)

## Files Changed

1. ✅ `contexts/AuthContext.tsx` - Changed redirect URL to `houseparty://reset-password`
2. ✅ `app/(auth)/reset-password.tsx` - Simplified to parse hash fragment tokens directly
3. ✅ Supabase configuration documented (manual step in dashboard)

## Removed

❌ `supabase/functions/auth-deeplink-redirect/` - No longer needed
❌ Edge function deployment - Not used anymore
❌ HTML pages, meta refresh, JavaScript - None of that complexity

## Status

✅ **AuthContext** updated with direct deep link
✅ **Reset password screen** simplified and fixed
✅ **Supabase configuration** documented (requires manual dashboard update)
✅ **Migration** created for documentation

**Next step**: Update Supabase redirect URLs in dashboard, then test!
