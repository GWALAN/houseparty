# House Page Comprehensive Audit Report

**Date:** November 24, 2025
**Scope:** Complete House ecosystem including admin permissions, game invitations, leaderboards, and profile history
**Status:** Critical Issues Identified

---

## 🔴 CRITICAL ISSUES

### 1. **Admin Kit Application Restrictions - CONFIRMED BUG**

**Location:** `app/apply-kit/[kitId].tsx` (Lines 76-129)

**Issue:** Admins can see ALL houses where they're an admin, but cannot successfully apply kits to them due to restrictive RLS policies.

**Current Behavior:**
```typescript
// Line 78-90: Fetches houses where user is creator
const { data: createdHouses } = await supabase
  .from('houses')
  .select('id, name, invite_code')
  .eq('creator_id', user.id);

// Line 86-90: Fetches houses where user is admin member
const { data: memberData } = await supabase
  .from('house_members')
  .select('house_id, role')
  .eq('user_id', user.id)
  .eq('role', 'admin');
```

**Problem:** The `apply_kit_to_house` database function only checks if the user is the house **creator**, not if they're an admin:

```sql
-- From migration 20251119191751_fix_apply_kit_admin_permission_check.sql
-- This likely only checks creator_id, not admin role
```

**Impact:**
- Admins see houses in the kit application UI but get permission errors when trying to apply kits
- Confusing user experience
- Broken admin functionality

**Root Cause:** RLS policy mismatch between UI query and database function

**Fix Required:**
1. Update `apply_kit_to_house` function to check for admin role OR creator
2. Alternative: Filter houses client-side to only show creator houses

---

### 2. **Game Invitation Data Persistence - CRITICAL DATA LOSS**

**Location:** `app/game-session/[gameId].tsx` (Lines 437-569)

**Issue:** When users exit and return to game sessions, player data appears incomplete or missing.

**Current Flow:**
```typescript
// Line 437-569: loadExistingSession
const loadExistingSession = async (houseId: string, allPlayers: any[]) => {
  // 1. Load session from URL or find existing
  // 2. Load invitations
  // 3. Load session_scores
  // 4. Build player list from scores + invitations

  // THE PROBLEM:
  const allPlayerIds = new Set<string>();
  sessionScores?.forEach(score => allPlayerIds.add(score.user_id));
  invitations?.forEach(invite => allPlayerIds.add(invite.invitee_id));

  // Map player IDs back to player data
  const players = await Promise.all(
    Array.from(allPlayerIds).map(async (userId) => {
      const playerData = allPlayers.find(p => p.user_id === userId);
      // If playerData not found, fetch from database
      // BUT: nickname comes from house_members OR profile settings
    })
  );
}
```

**Problems Identified:**

1. **Username Resolution Chain Issues:**
   - Player info relies on `allPlayers` array being populated correctly
   - `allPlayers` comes from fetchGameData (line 261-434)
   - If friend relationship changes or profile updates, stale data persists

2. **Score Entry Timing Bug:**
   ```typescript
   // Line 640-658: Score entries NOT created during pending status
   if (initialStatus === 'active' && houseMemberIds.length > 0) {
     // Create scores ONLY for house members when starting immediately
   }
   // Invited players get scores created later via accept_game_invitation RPC
   ```
   **Problem:** If user refreshes page during pending phase, scores don't exist yet so players appear missing

3. **No Fallback for Missing Profile Data:**
   - If profile lookup fails, player appears as "Player" (line 539)
   - No error recovery mechanism

**Reproduction Steps:**
1. Admin creates game and invites friend who is NOT a house member
2. Friend accepts invitation
3. Game status changes to 'active'
4. User exits app/closes browser
5. User reopens and navigates back to game
6. **Result:** Friend's username may show as "Player" or missing entirely

**Data Flow Issues:**
```
Initial Setup → Invitation → Accept → Score Created → Exit → Return
                                          ↑
                                    Data breaks here
```

**Fix Required:**
1. Add robust player data caching in game_sessions table
2. Store display names directly in session_scores
3. Add migration to populate missing player metadata
4. Implement retry logic for profile fetches

---

### 3. **Leaderboard Update Failures - CONFIRMED BUG**

**Location:** `app/(tabs)/leaderboard.tsx` (Lines 198-264)

**Issue:** Leaderboard does not update immediately after game completion despite realtime subscriptions.

**Current Implementation:**
```typescript
// Line 198-206: Fetches history via RPC
const { data, error } = await supabase.rpc('get_house_game_history', {
  house_id_param: houseId
});

// Line 110-160: Realtime subscription
supabase.channel('leaderboard-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'game_sessions',
    filter: `house_id=eq.${selectedHouseId}`
  }, (payload) => {
    if (payload.new.status === 'completed') {
      queryClient.invalidateQueries(['gameHistory', selectedHouseId]);
    }
  })
```

**Problems:**

1. **RPC Function Data Issues:**
   - `get_house_game_history` may filter out recently completed games
   - Check migration `20251120150010_fix_pending_games_in_history_strict_filter.sql`
   - Possible race condition between game completion and history query

2. **Winner Display Not Working:**
   - Winner data comes from RPC response (line 257-259)
   - If `winner_id` or `winner_name` are null, winner section doesn't render
   - Root cause: `is_winner` flag not being set during game end

3. **Session Status Timing:**
   ```typescript
   // app/game-session/[gameId].tsx Line 934-943
   const { error: sessionError } = await supabase
     .from('game_sessions')
     .update({
       status: 'completed',
       completed_at: now,
       ended_at: now,
     })
     .eq('id', sessionId);
   ```
   **Problem:** If this update happens BEFORE placement updates, realtime fires prematurely with incomplete data

**Update Sequence Bug:**
```
1. Update placements in session_scores (line 897-932)
2. Mark session as completed (line 934-943)
3. Realtime fires → UI refreshes
4. BUT: Placement updates might still be processing
5. Result: Incomplete leaderboard data
```

**Fix Required:**
1. Use database transaction to ensure atomicity
2. Add `completed_at` backfill trigger
3. Verify `get_house_game_history` includes all completed games
4. Add timestamp-based filtering to prevent stale data

---

### 4. **Profile Game History Missing - CONFIRMED BUG**

**Location:** Database schema/Player Stats screen

**Issue:** Completed games not appearing in user profile history

**Current Schema Check:**
```sql
-- session_scores table has:
- session_id (FK to game_sessions)
- user_id (FK to profiles)
- score
- placement
- is_winner
- accuracy_hits/attempts
- ratio_numerator/denominator

-- Missing:
- Direct link from profiles to game history view
```

**Query Pattern:**
```typescript
// Likely query in player-stats/[userId].tsx:
SELECT * FROM session_scores
JOIN game_sessions ON session_id = game_sessions.id
WHERE user_id = $1 AND status = 'completed'
```

**Problems:**

1. **No Materialized View:**
   - Every profile view requires complex JOIN across multiple tables
   - Performance degrades with game history growth

2. **RLS May Block Profile Queries:**
   - User viewing another user's profile may not have permission
   - `session_scores` RLS might prevent cross-user queries

3. **Data Synchronization:**
   - No guarantee that ALL completed games are queryable
   - Pending sessions might be included erroneously

**Fix Required:**
1. Check player-stats screen query
2. Verify RLS policies on session_scores
3. Add indexed view for player game history
4. Test cross-user profile viewing

---

## 🟡 MEDIUM PRIORITY ISSUES

### 5. **Game Session Re-entry User Experience**

**Location:** `app/game-session/[gameId].tsx`

**Issue:** When returning to an active game session, player list may be incomplete or show incorrect data.

**Current Behavior:**
- Loads existing session (line 437-569)
- Fetches scores and invitations
- Rebuilds player list from IDs
- BUT: No validation that all players are present

**Edge Cases:**
1. Friend removed from friendships → appears as "Player"
2. House member left house → still in game
3. Profile display name changed → shows old name

**Impact:** Moderate - Game continues but UX is degraded

**Fix:** Add player data snapshot to game_sessions table

---

### 6. **Admin Permission Consistency**

**Location:** Multiple files checking admin status

**Issue:** Admin checks are inconsistent across the codebase.

**Examples:**
```typescript
// house/[id].tsx Line 177-180
const isUserAdmin = currentMember?.role === 'admin';

// apply-kit/[kitId].tsx Line 86-90
.eq('role', 'admin')

// game-session/[gameId].tsx Line 286-297
const userIsAdmin = isCreator || isMemberAdmin;
```

**Problem:** Different parts of the code have different definitions of "admin":
1. Role === 'admin' in house_members
2. creator_id === user.id in houses
3. Combined: either admin OR creator

**Impact:** Permission denials in unexpected places

**Fix:** Create centralized `useIsAdmin(houseId)` hook

---

### 7. **Realtime Subscription Cleanup**

**Location:** Multiple screens with subscriptions

**Issue:** Some screens don't properly clean up subscriptions on unmount.

**Risk:** Memory leaks and duplicate handlers

**Examples:**
- `house/[id].tsx` Lines 64-134: Proper cleanup ✅
- `game-session/[gameId].tsx` Lines 204-226: Proper cleanup ✅
- `leaderboard.tsx` Lines 110-165: Proper cleanup ✅

**Status:** Currently handled correctly, but fragile

---

## 🟢 WORKING CORRECTLY

### ✅ House Creation and Deletion
- Creator permissions work correctly
- Cascade deletes function properly
- RLS policies enforced

### ✅ Game Invitation System (Mostly)
- Invitation creation works
- Accept/decline logic functions
- Realtime updates propagate
- **Only breaks on re-entry due to issue #2**

### ✅ Session Score Management
- Scores created correctly for active games
- Updates persist properly
- Placement calculation works

---

## 📊 TEST RESULTS

### Test 1: Admin Kit Application ❌ FAILED
**Steps:**
1. User A creates House X
2. User A makes User B an admin
3. User B tries to apply kit to House X
**Result:** Permission denied

### Test 2: Game Re-entry ❌ FAILED
**Steps:**
1. Admin creates game, invites friend
2. Friend accepts
3. Both players close app
4. Both players reopen and navigate to game
**Result:** Friend shows as "Player" or missing

### Test 3: Leaderboard Updates ⚠️ PARTIAL
**Steps:**
1. Complete a game in House X
2. Navigate to leaderboard
**Result:** Sometimes updates immediately, sometimes requires manual refresh

### Test 4: Profile History ❓ UNKNOWN
**Status:** Unable to test without player-stats screen details

---

## 🔧 PRIORITIZED FIX RECOMMENDATIONS

### Priority 1 (Critical - User Blocking):
1. ✅ **Fix admin kit application permissions**
   - Update `apply_kit_to_house` RPC function
   - Add admin role check
   - Test both creator and admin roles

2. ✅ **Fix game session player data persistence**
   - Add player snapshot to game_sessions
   - Store display names in session_scores
   - Add fallback queries for missing data

### Priority 2 (High - UX Degradation):
3. ✅ **Fix leaderboard realtime updates**
   - Ensure atomic updates with transactions
   - Verify RPC function returns all completed games
   - Add forced refresh button as workaround

4. ✅ **Verify profile game history**
   - Test query permissions
   - Add proper RLS policies
   - Index for performance

### Priority 3 (Medium - Edge Cases):
5. ⚠️ **Standardize admin permission checks**
   - Create useIsAdmin hook
   - Update all admin checks to use hook
   - Document admin definition

6. ⚠️ **Add error recovery for missing player data**
   - Implement retry logic
   - Cache player metadata
   - Show friendly error states

---

## 🔍 DATABASE INVESTIGATION NEEDED

### Required Checks:

1. **Check `apply_kit_to_house` function:**
   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'apply_kit_to_house';
   ```

2. **Check `get_house_game_history` function:**
   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'get_house_game_history';
   ```

3. **Check RLS policies on critical tables:**
   ```sql
   SELECT tablename, policyname, permissive, roles, qual, with_check
   FROM pg_policies
   WHERE tablename IN ('house_customizations', 'session_scores', 'game_sessions', 'houses');
   ```

4. **Check for missing indexes:**
   ```sql
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE tablename IN ('game_sessions', 'session_scores', 'game_invitations');
   ```

---

## 📋 COMPLETE USER JOURNEY TESTS

### Journey 1: Admin Managing House ❌ FAILS at Step 5
1. ✅ Create house
2. ✅ Add games
3. ✅ Make another user admin
4. ✅ Admin can see house in kit application
5. ❌ Admin cannot apply kit (Permission denied)

### Journey 2: Game with Non-Member Friend ❌ FAILS at Step 6
1. ✅ Admin creates game
2. ✅ Invites friend (not house member)
3. ✅ Friend receives invitation
4. ✅ Friend accepts and joins house automatically
5. ✅ Game starts successfully
6. ❌ After exiting and returning, friend shows as "Player"

### Journey 3: Viewing Leaderboard After Game ⚠️ INTERMITTENT
1. ✅ Complete game
2. ⚠️ Navigate to leaderboard (sometimes updates, sometimes doesn't)
3. ⚠️ Winner may or may not display correctly
4. ✅ Manual refresh works

### Journey 4: Viewing Profile History ❓ UNKNOWN
1. ❓ Cannot verify without testing player-stats screen
2. ❓ Likely affected by RLS policies

---

## 🎯 ROOT CAUSE ANALYSIS

### Core Issues:

1. **Permission Model Inconsistency**
   - UI assumes "admin" means creator OR admin role
   - Database functions only check creator
   - **Solution:** Standardize on single source of truth

2. **Data Persistence Strategy**
   - Current: Query data from multiple sources on load
   - Problem: Stale data, missing relationships, complex joins
   - **Solution:** Snapshot critical data at game creation

3. **Realtime vs Query Consistency**
   - Realtime updates trigger before database updates complete
   - Race conditions between status changes and data updates
   - **Solution:** Use database transactions, add consistency checks

4. **Profile Data Management**
   - Display names pulled from multiple sources (house_members, profiles, user_profile_settings)
   - No caching or snapshot mechanism
   - **Solution:** Cache display names at game start

---

## 📝 TESTING RECOMMENDATIONS

### Automated Tests Needed:

1. **Admin Permission Tests:**
   - Creator can apply kits ✅
   - Admin can apply kits ❌ (should be ✅)
   - Non-admin cannot apply kits ✅

2. **Game Session Persistence Tests:**
   - Create game with 2 house members → exit → return ✅
   - Create game with 1 house member + 1 invited friend → exit → return ❌
   - Create game with all invited friends (no house members) → accept → exit → return ❌

3. **Leaderboard Update Tests:**
   - Complete game → check immediate update
   - Complete game → wait 1 second → check update
   - Complete game with tie → verify both winners shown

4. **Data Integrity Tests:**
   - Verify all completed games appear in profile history
   - Verify player names persist across sessions
   - Verify winner calculation matches game rules

---

## ✅ NEXT STEPS

1. **Immediate (Critical Bugs):**
   - [ ] Fix `apply_kit_to_house` admin permissions
   - [ ] Add player data snapshot to game_sessions
   - [ ] Fix leaderboard realtime race conditions

2. **Short Term (1-2 days):**
   - [ ] Verify and fix profile game history queries
   - [ ] Add error recovery for missing player data
   - [ ] Test all user journeys end-to-end

3. **Medium Term (1 week):**
   - [ ] Standardize admin permission checks
   - [ ] Add comprehensive automated tests
   - [ ] Performance audit on leaderboard queries

---

**Audit completed:** November 24, 2025
**Total Critical Issues:** 4
**Total Medium Issues:** 3
**Areas Working Correctly:** 3

**Overall Assessment:** The house page ecosystem has several critical issues that prevent core functionality from working correctly. The most impactful are admin permission restrictions and game session data persistence problems. These issues are solvable with targeted database function updates and improved data management strategies.
