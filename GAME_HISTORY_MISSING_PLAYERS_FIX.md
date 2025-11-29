# Game History Missing Players - Bug Fix

## Problem Summary
When two or more players play a game, only some players appear in the game history. Specifically, invited players who accept invitations don't show up in game results.

## Root Cause Analysis

### What Was Happening:
1. **FortniteTest** (house member) creates a game session
2. **FortniteTest** invites **Elandre** to play
3. **Elandre** receives invitation and accepts it
4. Both players play the game and submit scores
5. Game completes successfully
6. **BUT** Game history only shows **FortniteTest** as a participant!

### Why This Happened:

#### Score Entry Creation Flow:
When a game session starts (`app/game-session/[gameId].tsx` line 639-654):
```typescript
// Score entries created ONLY for house members at game start
const scoreInserts = houseMemberIds.map((playerId) => ({
  session_id: session.id,
  user_id: playerId,
  score: 0,
  is_winner: false,
}));

await supabase.from('session_scores').insert(scoreInserts);
```

**Problem:** Non-members who receive invitations don't get score entries at this point.

#### Invitation Acceptance Flow:
When an invited player accepts (`accept_game_invitation` function):
```sql
-- The function was doing:
1. Add user to house (if not member)
2. Mark invitation as 'accepted'
3. Log analytics event

-- What it was NOT doing:
4. Create session_scores entry for the player ❌
```

### Database Evidence:
```sql
Game Session: dc881a6b-df4e-4ef2-bfbf-3f41be923d24
- Created by: FortniteTest
- Invitation sent to: Elandre (status: accepted ✓)
- Score entries:
  - FortniteTest: 320 kg, placement 2 ✓
  - Elandre: NO ENTRY ❌

Result: Only FortniteTest appears in game history!
```

## The Fix

Updated `accept_game_invitation` function to create a `session_scores` entry when a player accepts an invitation:

```sql
-- NEW CODE ADDED:
-- After accepting invitation, create score entry for the player
IF NOT EXISTS (
  SELECT 1 FROM session_scores
  WHERE session_id = v_invitation.game_session_id
    AND user_id = auth.uid()
) THEN
  INSERT INTO session_scores (
    session_id,
    user_id,
    score,
    is_winner
  )
  VALUES (
    v_invitation.game_session_id,
    auth.uid(),
    0,           -- Initial score
    false        -- Will be updated when game completes
  );
END IF;
```

### What This Fixes:
1. ✅ Invited players now get score entries when they accept
2. ✅ All participants appear in game history
3. ✅ Scoring and placement calculations work correctly
4. ✅ Leaderboards show accurate game counts
5. ✅ Win/loss tracking is complete

## Impact

### Before Fix:
- Only the game creator and existing house members appeared in history
- Invited players' participation was lost
- Game history was incomplete and confusing
- Leaderboards undercounted games for invited players

### After Fix:
- All players who accept invitations appear in game history
- Complete participation records
- Accurate scoring and placement for everyone
- Proper game history display

## Testing Checklist

To verify the fix works:

1. **Create a game with invitations:**
   - [ ] User A (house member) creates game
   - [ ] User A invites User B (non-member)
   - [ ] User B accepts invitation

2. **Play the game:**
   - [ ] Both users submit scores
   - [ ] Complete the game

3. **Check game history:**
   - [ ] Both User A and User B appear in history
   - [ ] Both scores are displayed correctly
   - [ ] Placements are correct (1st, 2nd, etc.)
   - [ ] Winner is marked correctly

4. **Check leaderboards:**
   - [ ] Both players' game counts increased
   - [ ] Win/loss records updated correctly

## Migration Applied
- File: `fix_accept_invitation_create_score_entry.sql`
- Date: 2025-11-18
- Function: `accept_game_invitation(uuid)`

## Related Issues
- Scoring system audit (SCORING_AUDIT_REPORT.md)
- Profile photo upload fix (PROFILE_PHOTO_UPLOAD_FIX.md)
- Kit application modal fix

## Notes
- The fix includes a safety check to prevent duplicate score entries
- Existing game sessions are not affected (historical data remains as-is)
- Future games will work correctly from now on
