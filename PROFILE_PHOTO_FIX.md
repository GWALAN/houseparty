# Profile Photo Display Fix - Friends Tab

**Date:** November 25, 2025
**Issue:** Friend profile photos not showing in Friends tab
**Status:** ✅ FIXED

---

## Problem

When viewing the Friends tab, profile pictures weren't displaying for friends who had uploaded profile photos. Instead, users saw only the placeholder avatar (initials or icon).

---

## Root Cause

**Data Mismatch:**
- Friends list was querying `profiles.avatar_url` (old field)
- Profile photos are actually stored in `user_profile_settings.profile_photo_url`
- The query was fetching the wrong field, so photos never loaded

**Affected Queries:**
1. `fetchFriends()` - Friends list
2. `fetchPendingRequests()` - Incoming friend requests
3. `fetchSentRequests()` - Outgoing friend requests

---

## Solution

Updated all three functions to:
1. Query `user_profile_settings.profile_photo_url` in addition to display names
2. Create a mapping of user IDs to profile photo URLs
3. Use profile photo URL as primary source, fall back to `profiles.avatar_url`

---

## Code Changes

### Before (Wrong Field)
```typescript
const { data: settings } = await supabase
  .from('user_profile_settings')
  .select('user_id, display_name')  // ❌ Missing profile_photo_url
  .in('user_id', friendIds);

const displayNameMap = new Map(settings?.map(s => [s.user_id, s.display_name]) || []);

// Only using profiles.avatar_url (usually empty)
avatar_url: f.profiles?.avatar_url || null
```

### After (Correct Field)
```typescript
const { data: settings } = await supabase
  .from('user_profile_settings')
  .select('user_id, display_name, profile_photo_url')  // ✅ Added profile_photo_url
  .in('user_id', friendIds);

const displayNameMap = new Map(settings?.map(s => [s.user_id, s.display_name]) || []);
const profilePhotoMap = new Map(settings?.map(s => [s.user_id, s.profile_photo_url]) || []);  // ✅ New mapping

// Using profile_photo_url first, then fallback to avatar_url
avatar_url: profilePhotoMap.get(f.friend_id) || f.profiles?.avatar_url || null
```

---

## Files Modified

**File:** `app/(tabs)/friends.tsx`

**Functions Updated:**
1. `fetchFriends()` - Lines 217-257
2. `fetchPendingRequests()` - Lines 259-304
3. `fetchSentRequests()` - Lines 307-354

---

## What Changed

### 1. fetchFriends() ✅
**Purpose:** Load all friends for current user

**Changes:**
- Added `profile_photo_url` to settings query
- Created `profilePhotoMap` to map user IDs to photos
- Updated avatar_url assignment to check `profilePhotoMap` first

**Before:**
```typescript
avatar_url: f.profiles?.avatar_url || null
```

**After:**
```typescript
avatar_url: profilePhotoMap.get(f.friend_id) || f.profiles?.avatar_url || null
```

---

### 2. fetchPendingRequests() ✅
**Purpose:** Load incoming friend requests

**Changes:**
- Added `profile_photo_url` to settings query
- Created `profilePhotoMap` for request senders
- Updated sender.avatar_url to use profile photos

**Before:**
```typescript
sender: {
  avatar_url: r.profiles?.avatar_url || null
}
```

**After:**
```typescript
sender: {
  avatar_url: profilePhotoMap.get(r.sender_id) || r.profiles?.avatar_url || null
}
```

---

### 3. fetchSentRequests() ✅
**Purpose:** Load outgoing friend requests

**Changes:**
- Added `profile_photo_url` to settings query
- Created `profilePhotoMap` for request recipients
- Updated sender.avatar_url (represents recipient in sent requests)

**Before:**
```typescript
sender: {
  avatar_url: r.profiles?.avatar_url || null
}
```

**After:**
```typescript
sender: {
  avatar_url: profilePhotoMap.get(r.recipient_id) || r.profiles?.avatar_url || null
}
```

---

## How It Works Now

### Data Flow

1. **Query Friendships/Requests**
   - Get basic profile data from `profiles` table
   - Get friend/sender/recipient IDs

2. **Batch Query Settings**
   - Fetch `display_name` AND `profile_photo_url` for all relevant users
   - Create two Maps: one for display names, one for profile photos

3. **Merge Data**
   - Prioritize `profile_photo_url` from settings
   - Fall back to `avatar_url` from profiles (legacy field)
   - Show placeholder if neither exists

4. **Render in UI**
   - Pass merged data to friend cards
   - Images display correctly using Supabase storage URLs

---

## Testing Checklist

Test these scenarios to verify the fix:

- [x] View friends list
- [x] Friends with uploaded photos show their actual photos
- [x] Friends without photos show placeholder
- [x] Incoming friend requests show sender photos
- [x] Outgoing friend requests show recipient photos
- [x] Photos load from Supabase storage correctly
- [x] No broken image placeholders

---

## Database Schema Reference

### Tables Involved

**profiles** (Basic user info)
```sql
- id: uuid
- username: text
- avatar_url: text  -- Legacy field, mostly empty
```

**user_profile_settings** (Extended user settings)
```sql
- user_id: uuid
- display_name: text
- profile_photo_url: text  -- Actual profile photos stored here
```

**friendships** (Friend relationships)
```sql
- id: uuid
- user_id: uuid
- friend_id: uuid
```

---

## Why This Happened

**Historical Context:**
1. Originally, avatars were stored in `profiles.avatar_url`
2. Later, profile photos moved to `user_profile_settings.profile_photo_url`
3. Friends tab wasn't updated to query the new location
4. Photos existed in database but weren't being fetched

**Prevention:**
- Always check which table stores which data
- Document data locations in schema
- Update all queries when data structure changes

---

## Performance Impact

**Before Fix:**
- 1 query for friendships
- 1 query for display names
- Total: 2 queries

**After Fix:**
- 1 query for friendships
- 1 query for display names + profile photos
- Total: 2 queries (same performance, just fetching one more field)

**Conclusion:** No performance degradation, just fetching the correct data!

---

## Related Components

These components also handle profile photos correctly:

- `components/UserAvatar.tsx` - Knows to fetch from `profile_photo_url`
- `app/profile-settings.tsx` - Uploads to `profile_photo_url`
- `app/player-stats/[userId].tsx` - Displays profile photos correctly

---

## Summary

Profile photos now display correctly throughout the Friends tab by fetching from the correct database field (`user_profile_settings.profile_photo_url`) instead of the legacy field (`profiles.avatar_url`).

**Result:** Friends with uploaded photos now show their actual profile pictures! ✅
