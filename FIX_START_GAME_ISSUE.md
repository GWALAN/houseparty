# Fix: Start Game Button Issue

## Problem
When clicking "Start Game" on the player selection screen, the page just refreshes and doesn't actually start the game. The console shows this error:

```
[GAME SESSION] Error creating scores:
new row violates row-level security policy for table "session_scores"
```

## Root Cause
The RLS (Row Level Security) policy on the `session_scores` table is preventing the game session creator from inserting score records for other players. This happens because:

1. User creates a game session
2. System tries to insert score records for all selected players (including friends/house members)
3. RLS policy blocks the insert because it's checking the wrong condition

## Solution
The RLS policy needs to be updated to allow the game session creator to insert scores for ALL players in their session, not just themselves.

### SQL Fix
Run this SQL in your Supabase Dashboard:

```sql
DROP POLICY IF EXISTS "Session creators can create scores for all players" ON session_scores;
DROP POLICY IF EXISTS "Users can create their own session scores" ON session_scores;

CREATE POLICY "Session creators can insert scores for all players"
  ON session_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = session_id
      AND gs.created_by = auth.uid()
    )
  );
```

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://nvppeeaejybronzhklzu.supabase.co/project/_/sql/new
2. Paste the SQL above
3. Click "Run"

### Option 2: Using Supabase CLI (if linked)
```bash
npx supabase db push
```

The migration file has been created at:
`supabase/migrations/20251112120000_fix_session_scores_insert_policy.sql`

## Technical Details

The key change is in the `WITH CHECK` clause for the INSERT policy:
- **Before**: Used `session_scores.session_id` which doesn't work properly during INSERT
- **After**: Uses bare `session_id` which correctly references the NEW value being inserted

This allows PostgreSQL RLS to properly evaluate the policy during bulk inserts when creating a new game session.

## Verification
After applying the fix:
1. Go to the game session screen
2. Select 2+ players
3. Click "Start Game"
4. The game should start successfully without errors

## Related Files
- `app/game-session/[gameId].tsx` - Game session screen (lines 257-318)
- `supabase/migrations/20251112120000_fix_session_scores_insert_policy.sql` - Migration file
