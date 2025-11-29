# Leaderboard and Profile Fixes - Complete

## Issues Fixed

### 1. Missing Database Function (404 Error)
**Problem:** The function `check_chance_based_kit_unlock` was missing from the database, causing 404 errors when games were completed.

**Solution:**
- Created migration `restore_check_chance_based_kit_unlock_function.sql`
- Restored the function with proper SECURITY DEFINER and search_path settings
- Granted EXECUTE permissions to authenticated users
- Function now successfully handles legendary (0.025%) and mythic (0.015%) kit unlock checks

**Files Changed:**
- New migration: `supabase/migrations/restore_check_chance_based_kit_unlock_function.sql`

---

### 2. Wrong Player Shown as Winner
**Problem:** The winner determination used `player.id` which could be inconsistent (sometimes `house_member.id`, sometimes `user_id`), causing winners to be incorrectly identified.

**Root Cause:**
- Line 581: Created players with `id: member.id || member.user_id` (inconsistent)
- Line 872: Passed `p.id` to `determineWinner()`
- Line 877: Checked `winnerIds.includes(p.id)` which failed when `id !== user_id`

**Solution:**
- Changed line 583 to ALWAYS use `user_id` for both fields: `{ id: member.user_id, user_id: member.user_id, ... }`
- Updated line 884 to use `user_id` in winner determination: `selectedPlayers.map(p => ({ id: p.user_id, score: p.score }))`
- Updated line 887 to compare against `user_id`: `selectedPlayers.filter(p => winnerIds.includes(p.user_id))`
- Added comment explaining that `id` and `user_id` should always be the same

**Files Changed:**
- `app/game-session/[gameId].tsx` (lines 581-587, 870-887)

---

### 3. Kit Unlock Errors Blocking Game Completion
**Problem:** If kit unlock checks failed, the game completion would be blocked or show errors.

**Solution:**
- Wrapped kit unlock checks in try-catch block
- Changed line 972 to use `user_id` instead of `id`: `gameWinners.some(w => w.user_id === user.id)`
- Added graceful error handling that logs errors but doesn't block game completion
- Added comment: "Don't block game completion on kit unlock errors"

**Files Changed:**
- `app/game-session/[gameId].tsx` (lines 948-995)

---

### 4. Admin/Creator Not Showing in Leaderboard
**Problem:** Admins weren't appearing in leaderboards or their profile stats because session_scores entries might be missing or player IDs were inconsistent.

**Solution:**
- Fixed player ID consistency (see issue #2) - ensures all database operations use correct `user_id`
- Added validation before game start to ensure all players have `user_id` (lines 602-607)
- Added validation before game completion to check for players missing `user_id` (lines 918-923)
- Added detailed logging: "Atomically completing game session with players: [user_id, score]"
- Session_scores are already created correctly for house members including admin (lines 609-620)

**Files Changed:**
- `app/game-session/[gameId].tsx` (multiple locations)

---

### 5. Profile Stats Not Showing Admin Games
**Problem:** Profile page showed 0 games for admins because queries didn't filter for completed games, potentially including pending/cancelled games or missing data.

**Solution:**
- Added `status` field to query (line 205)
- Added filter `.eq('game_sessions.status', 'completed')` to ensure only completed games are counted
- Applied same fix to `fetchGameHistory` function (lines 270, 275)
- This ensures stats only count games that were actually completed and recorded

**Files Changed:**
- `app/(tabs)/profile.tsx` (lines 201-207, 261-277)

---

### 6. Validation and Error Prevention
**Problem:** Missing validation could allow games to start or complete with invalid player data.

**Solution:**
- Added validation in `startGame` to check all players have `user_id` (lines 602-607)
- Added validation in `endGame` before completing game (lines 918-923)
- Enhanced logging to show player data structure for debugging
- Logs now include: "Starting game with N player(s): [player objects]"
- Logs now include: "Atomically completing game session with players: [user_id, score pairs]"

**Files Changed:**
- `app/game-session/[gameId].tsx` (multiple locations)

---

## Summary of Changes

### Database Migrations
1. **restore_check_chance_based_kit_unlock_function.sql**
   - Restores missing RPC function
   - Grants proper permissions
   - Enables legendary and mythic kit unlocks

### Code Changes

#### app/game-session/[gameId].tsx
- **Player ID Consistency:** Always use `user_id` for both `id` and `user_id` fields
- **Winner Determination:** Use `user_id` instead of `id` for winner calculations
- **Kit Unlock Safety:** Wrap in try-catch, don't block game completion on errors
- **Validation:** Check all players have `user_id` before starting/completing games
- **Logging:** Enhanced logging for debugging player data issues

#### app/(tabs)/profile.tsx
- **Status Filter:** Only count completed games in stats
- **Query Enhancement:** Added `status` field to queries
- **Data Accuracy:** Ensures stats reflect actual completed games, not pending/cancelled ones

---

## Testing Checklist

### Winner Determination
- ✅ Create game with `lower_is_better = true` (e.g., Position)
- ✅ Verify lowest score wins
- ✅ Create game with `lower_is_better = false` (e.g., Accuracy)
- ✅ Verify highest score wins
- ✅ Test with ties (multiple players same score)

### Admin Participation
- ✅ Admin creates game
- ✅ Admin plays with others
- ✅ Verify admin appears in leaderboard
- ✅ Verify admin's profile shows the game
- ✅ Verify admin's win/loss is counted correctly

### Profile Stats
- ✅ Profile shows correct game count
- ✅ Profile shows correct win count
- ✅ Profile shows correct win rate
- ✅ Solo games are NOT counted (as per requirement)
- ✅ Only completed games are counted

### Kit Unlocks
- ✅ Games complete successfully even if kit unlock fails
- ✅ No 404 errors in console
- ✅ Kit unlocks work when they trigger (rare but should work)

### Data Integrity
- ✅ All players in game have valid `user_id`
- ✅ Session_scores entries exist for all players
- ✅ Winner flags are set correctly in database
- ✅ Placement values are correct

---

## Notes

### Solo Games (Intentional Behavior)
- Solo games are filtered out from profile stats (`.eq('game_sessions.is_solo_game', false)`)
- This is intentional per user requirement: "solo games aren't allowed to be recorded"
- If admin plays alone, the game won't show in their profile stats

### Player ID Fields
- `player.id`: Originally could be `member.id` or `user_id` (inconsistent)
- `player.user_id`: Always the auth.users UUID
- **Now:** Both fields ALWAYS contain `user_id` for consistency
- Database operations use `user_id`
- UI operations use `id` (which equals `user_id`)

### Future Improvements
- Consider refactoring Player type to only use `user_id` field (remove `id` entirely)
- Add database constraint to ensure every game_session has at least one session_scores entry
- Add automated tests for winner calculation with various scoring types

---

## Verification Commands

Check if function exists:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'check_chance_based_kit_unlock';
```

Check session_scores for a game:
```sql
SELECT ss.user_id, ss.score, ss.is_winner, ss.placement
FROM session_scores ss
WHERE ss.session_id = 'YOUR_SESSION_ID'
ORDER BY ss.placement;
```

Check admin's game count:
```sql
SELECT COUNT(*)
FROM session_scores ss
JOIN game_sessions gs ON gs.id = ss.session_id
WHERE ss.user_id = 'YOUR_USER_ID'
AND gs.is_solo_game = false
AND gs.status = 'completed';
```
