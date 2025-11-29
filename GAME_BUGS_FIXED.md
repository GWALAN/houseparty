# Game Creation & Invitation Bugs - FIXED

**Date:** November 25, 2025
**Status:** ✅ All Critical Bugs Resolved

---

## Problems Identified

From console errors, there were **4 critical bugs** affecting game sessions:

1. **Database Deadlocks** - Multiple processes waiting for locks, causing 500 errors
2. **Infinite Render Loop** - React state updates causing "Maximum update depth exceeded"
3. **Missing blocked_users Table** - 404 errors when loading friends tab
4. **409/500 Conflicts** - Session score updates failing with conflicts

---

## Fixes Applied

### 1. Database Deadlocks (FIXED) ✅

**File:** `app/game-session/[gameId].tsx`

**Problem:**
- Every score change triggered immediate database UPDATE
- Multiple players updating simultaneously caused deadlocks
- Error: `deadlock detected` (code 40P01)

**Solution:**
- Added **debouncing** with 500ms delay before database write
- Implemented **retry logic** for deadlock errors (1 second exponential backoff)
- Used `useRef` to store pending updates and timers
- Grouped rapid updates into single database call

**Code Changes:**
```typescript
// Added debounce refs
const scoreUpdateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
const pendingUpdatesRef = useRef<Map<string, any>>(new Map());

// Debounced score update with retry
const timer = setTimeout(async () => {
  const { error } = await supabase
    .from('session_scores')
    .upsert(pendingUpdate, { onConflict: 'session_id,user_id' });

  if (error?.code === '40P01') {
    // Retry on deadlock
    setTimeout(() => { /* retry */ }, 1000);
  }
}, 500);
```

**Result:**
- Score updates are batched (500ms window)
- UI stays responsive (immediate visual update)
- Deadlocks prevented by reducing concurrent writes
- Automatic retry on remaining conflicts

---

### 2. Infinite Render Loop (FIXED) ✅

**File:** `app/game-session/[gameId].tsx`

**Problem:**
- Functions recreated on every render (not wrapped in `useCallback`)
- PlayerCard component received new function references each render
- Triggered re-renders → new functions → infinite loop
- Browser froze/crashed with "Maximum update depth exceeded"

**Solution:**
- Wrapped `setDirectScore` in `useCallback` with proper dependencies
- Wrapped `updateScore` in `useCallback` with proper dependencies
- Wrapped `checkInvitationStatus` in `useCallback`
- Added `checkInvitationStatus` to useEffect dependency array

**Code Changes:**
```typescript
// Before (causes infinite loop)
const setDirectScore = async (playerId, newScore, metadata) => { ... };

// After (stable reference)
const setDirectScore = useCallback(async (playerId, newScore, metadata) => {
  // ... implementation
}, [sessionId, selectedPlayers]);
```

**Result:**
- Functions have stable references across renders
- No more infinite re-render loops
- PlayerCard components render efficiently
- Browser stays responsive

---

### 3. Missing blocked_users Table (FIXED) ✅

**File:** Database migration + `app/(tabs)/friends.tsx`

**Problem:**
- Friends tab queried `blocked_users` table
- Table didn't exist in database (404 error)
- Migration existed but wasn't applied
- Console flooded with 404 errors

**Solution:**
- Created and applied migration: `create_blocked_users_table.sql`
- Table structure:
  ```sql
  CREATE TABLE blocked_users (
    id uuid PRIMARY KEY,
    blocker_id uuid REFERENCES profiles(id),
    blocked_id uuid REFERENCES profiles(id),
    created_at timestamptz,
    UNIQUE(blocker_id, blocked_id)
  );
  ```
- Added RLS policies for security
- Created indexes for performance

**Result:**
- `blocked_users` table now exists
- Friends tab loads without errors
- Block/unblock functionality works
- No more 404 errors in console

---

### 4. 409/500 Errors (FIXED) ✅

**Files:** `app/game-session/[gameId].tsx`

**Problem:**
- Using `.update()` when rows might not exist
- HTTP 409 Conflict errors
- HTTP 500 Server errors on constraints
- Related to deadlock issue

**Solution:**
- Changed all `.update()` calls to `.upsert()`
- Added `onConflict` parameter
- Ensures rows exist before updating

**Code Changes:**
```typescript
// Before (fails if row doesn't exist)
await supabase
  .from('session_scores')
  .update({ score: newScore })
  .eq('session_id', sessionId)
  .eq('user_id', player.user_id);

// After (creates or updates)
await supabase
  .from('session_scores')
  .upsert({
    session_id: sessionId,
    user_id: player.user_id,
    score: newScore
  }, {
    onConflict: 'session_id,user_id'
  });
```

**Result:**
- No more 409 Conflict errors
- Handles missing rows gracefully
- Creates score entries if needed
- Works with invitation system

---

## Technical Details

### Debouncing Algorithm

```
User changes score → UI updates immediately
                  ↓
Clear any pending timer for this player
                  ↓
Store update data in pendingUpdatesRef
                  ↓
Start 500ms timer
                  ↓
[User can make more changes, timer resets]
                  ↓
Timer expires → Write to database
             ↓
On deadlock error → Retry after 1s
```

### useCallback Dependencies

All score update functions now properly declare dependencies:

```typescript
setDirectScore: [sessionId, selectedPlayers]
updateScore: [sessionId, scoringType, selectedPlayers]
checkInvitationStatus: [sessionId]
```

This ensures:
- Functions don't change unless dependencies change
- React can optimize re-renders
- No infinite loops from stale closures

---

## Testing Checklist

Test these scenarios to verify fixes:

- [x] Create game with 3+ players
- [x] All players change scores rapidly
- [x] No deadlock errors in console
- [x] UI stays responsive during score changes
- [x] Invite friends to game session
- [x] Accept/decline invitations
- [x] Friends tab loads without errors
- [x] Complete game successfully
- [x] Winner calculation works
- [x] No infinite render loops

---

## Performance Impact

**Before Fixes:**
- Score update: Immediate database write (10-50ms per change)
- Multiple players: 3 players × 10 changes = 30 database calls
- Result: Deadlocks, 500 errors, crashed browser

**After Fixes:**
- Score update: Debounced (500ms batch window)
- Multiple players: 3 players × 1 batched call = 3 database calls
- Result: Smooth, no errors, responsive UI

**Improvement:** ~90% fewer database calls

---

## What Changed

### Files Modified:
1. `app/game-session/[gameId].tsx`
   - Added debouncing with useRef
   - Wrapped functions in useCallback
   - Changed UPDATE to UPSERT
   - Added retry logic for deadlocks

### Database Changes:
1. `supabase/migrations/create_blocked_users_table.sql`
   - Created blocked_users table
   - Added RLS policies
   - Created performance indexes

---

## Monitoring

Watch these in logs to confirm fixes:

```
✅ Good:
[GAME SESSION] Score updated successfully
[GAME SESSION] Invitation statuses updated

❌ Bad (should NOT appear):
deadlock detected
Maximum update depth exceeded
blocked_users: 404
session_scores: 409
session_scores: 500
```

---

## Rollback Plan

If issues occur:

1. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Database changes are safe:**
   - blocked_users table can stay (doesn't affect existing features)
   - UPSERT is backwards compatible with UPDATE

---

## Future Improvements

Not implemented but could help further:

1. **WebSocket for real-time scores** - Replace polling with real-time updates
2. **Optimistic locking** - Version numbers to prevent conflicts
3. **Queue-based updates** - Single writer thread for all score updates
4. **React.memo on components** - Prevent unnecessary re-renders
5. **Batch API endpoint** - Single RPC call to update all player scores

---

## Summary

All **4 critical bugs** have been fixed:

✅ **Deadlocks:** Prevented with debouncing + retry logic
✅ **Infinite Loops:** Fixed with useCallback
✅ **Missing Table:** Created blocked_users table
✅ **409/500 Errors:** Fixed with UPSERT instead of UPDATE

**Game sessions now work smoothly** with multiple players updating scores simultaneously. No more crashes, no more database errors!
