# Player Stats Profile Photo Fix

**Date:** November 25, 2025
**Issue:** Dora's profile photo not showing on Player Stats page
**Status:** ✅ FIXED

---

## Problem

When viewing a player's stats page (by clicking on a friend), the profile photo was not displaying. Instead, only the first letter of the username appeared as a placeholder, even though the user had uploaded a profile photo.

**Symptoms:**
- Friends list showed profile photos correctly ✅
- Player stats page showed only initials ❌

---

## Root Cause

The Player Stats page (`app/player-stats/[userId].tsx`) was NOT fetching or displaying profile photos at all:

1. **Missing data fetch:** `fetchPlayerStats()` didn't query `profile_photo_url`
2. **Missing type:** `PlayerStats` type didn't include `profile_photo_url` field
3. **Hardcoded placeholder:** UI always showed first letter, never checked for photo

---

## Solution

Updated the Player Stats page to:
1. Fetch `profile_photo_url` from `user_profile_settings`
2. Add `profile_photo_url` to PlayerStats type
3. Display actual photo if available, fall back to initial letter

---

## Code Changes

### 1. Updated PlayerStats Type

**Before:**
```typescript
type PlayerStats = {
  user_id: string;
  username: string;
  total_games: number;
  // ... other stats
};
```

**After:**
```typescript
type PlayerStats = {
  user_id: string;
  username: string;
  profile_photo_url?: string | null;  // ✅ Added
  total_games: number;
  // ... other stats
};
```

---

### 2. Updated Data Fetch

**Before:**
```typescript
const { data: profileSettings } = await supabase
  .from('user_profile_settings')
  .select('is_private')  // ❌ Missing profile_photo_url
  .eq('user_id', userId)
  .maybeSingle();

const { data: profile } = await supabase
  .from('profiles')
  .select('username')  // ❌ Missing avatar_url
  .eq('id', userId)
  .maybeSingle();
```

**After:**
```typescript
const { data: profileSettings } = await supabase
  .from('user_profile_settings')
  .select('is_private, profile_photo_url')  // ✅ Added profile_photo_url
  .eq('user_id', userId)
  .maybeSingle();

const { data: profile } = await supabase
  .from('profiles')
  .select('username, avatar_url')  // ✅ Added avatar_url
  .eq('id', userId)
  .maybeSingle();
```

---

### 3. Updated Stats Object

**Before:**
```typescript
setStats({
  user_id: userId as string,
  username: profile?.username || 'Unknown',
  // ❌ No profile_photo_url
  total_games: totalGames,
  // ... other stats
});
```

**After:**
```typescript
setStats({
  user_id: userId as string,
  username: profile?.username || 'Unknown',
  profile_photo_url: profileSettings?.profile_photo_url || profile?.avatar_url || null,  // ✅ Added
  total_games: totalGames,
  // ... other stats
});
```

**Priority Order:**
1. `profileSettings?.profile_photo_url` (from user_profile_settings)
2. `profile?.avatar_url` (legacy field from profiles)
3. `null` (show placeholder)

---

### 4. Updated UI to Display Photo

**Before (always showed initial):**
```typescript
<View style={styles.avatarInner}>
  <Text style={styles.avatarText}>
    {stats.username[0].toUpperCase()}
  </Text>
</View>
```

**After (shows photo if available):**
```typescript
<View style={styles.avatarInner}>
  {stats.profile_photo_url ? (
    <Image
      source={{ uri: stats.profile_photo_url }}
      style={styles.avatarImage}
      resizeMode="cover"
    />
  ) : (
    <Text style={styles.avatarText}>
      {stats.username[0].toUpperCase()}
    </Text>
  )}
</View>
```

---

### 5. Added Image Style

```typescript
avatarImage: {
  width: 112,
  height: 112,
  borderRadius: 56,
},
```

---

## Files Modified

**File:** `app/player-stats/[userId].tsx`

**Changes:**
1. Added `Image` to React Native imports (line 1)
2. Updated `PlayerStats` type to include `profile_photo_url` (line 39)
3. Updated `fetchPlayerStats()` to fetch profile photo (lines 198-217)
4. Added `profile_photo_url` to stats objects (lines 253, 299)
5. Updated avatar display to show photo or fallback (lines 447-458)
6. Added `avatarImage` style (lines 676-680)

---

## How It Works Now

### Data Flow

1. **Fetch User Data**
   - Query `user_profile_settings` for `profile_photo_url` and `is_private`
   - Query `profiles` for `username` and `avatar_url` (fallback)

2. **Merge Photo URL**
   - Prioritize `profile_photo_url` from settings
   - Fall back to `avatar_url` from profiles (legacy)
   - Use `null` if neither exists

3. **Display in UI**
   - If photo URL exists → show `<Image>` component
   - If no photo URL → show initial letter in `<Text>`

4. **Render**
   - Photo displays in circular avatar (112x112px)
   - Maintains kit color border if equipped
   - Matches design of other profile displays

---

## Testing Checklist

Test these scenarios to verify the fix:

- [x] Click on friend with profile photo
- [x] Profile photo displays on stats page
- [x] Click on friend without profile photo
- [x] Initial letter displays correctly
- [x] Kit border colors still work
- [x] Photo loads from Supabase storage
- [x] No broken image placeholders
- [x] Private profiles still respect privacy settings

---

## Database Verification

Confirmed Dora's profile data in database:

```sql
SELECT
  p.username,
  p.avatar_url,
  ups.profile_photo_url
FROM profiles p
LEFT JOIN user_profile_settings ups ON ups.user_id = p.id
WHERE p.username = 'Dora';

Result:
- username: "Dora"
- avatar_url: null
- profile_photo_url: "https://qqeccmwtvjjysypahgkn.supabase.co/storage/v1/object/public/avatars/f98eab73-df4f-4476-92e3-6c070ed90cf8/profile.jpeg?t=1764086696322"
```

✅ Photo URL exists and is valid!

---

## Why This Happened

**Historical Context:**
- Player Stats page was built early
- Profile photos feature added later
- Stats page never updated to fetch new field
- Code worked for users without photos (showed initials)
- Bug only visible for users with uploaded photos

**Prevention:**
- Document all user data locations
- Update all views when adding new user fields
- Test with real user data (photos, settings, etc.)

---

## Performance Impact

**Before Fix:**
- 2 queries (settings + profile)
- No photo data fetched

**After Fix:**
- 2 queries (same count)
- Just added one more field to existing queries
- No additional network requests

**Conclusion:** Zero performance impact! 🚀

---

## Related Pages Fixed Earlier

These pages already display profile photos correctly:

- `app/(tabs)/friends.tsx` - Friends list ✅ (fixed earlier today)
- `app/profile-settings.tsx` - Profile settings ✅
- `components/UserAvatar.tsx` - Avatar component ✅

Now Player Stats page matches them!

---

## Summary

The Player Stats page now properly fetches and displays profile photos by:
1. Querying `profile_photo_url` from database
2. Adding photo to `PlayerStats` type
3. Conditionally rendering `Image` or initial letter
4. Prioritizing settings photo over legacy avatar_url

**Result:** Dora's profile photo (and all user photos) now display correctly on the Player Stats page! ✅

---

## Example Code Snippet

Here's the complete avatar rendering logic:

```typescript
<View style={styles.avatarInner}>
  {stats.profile_photo_url ? (
    // Show actual photo if available
    <Image
      source={{ uri: stats.profile_photo_url }}
      style={styles.avatarImage}
      resizeMode="cover"
    />
  ) : (
    // Fallback to initial letter
    <Text style={styles.avatarText}>
      {stats.username[0].toUpperCase()}
    </Text>
  )}
</View>
```

Simple, clean, and works perfectly! 🎉
