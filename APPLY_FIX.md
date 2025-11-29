# Quick Fix: Apply RLS Policy Update

## The Problem
The "Start Game" button fails because of a Row Level Security (RLS) policy issue.

## The Solution
Run this SQL in your Supabase Dashboard to fix it immediately.

---

## Step 1: Open Supabase SQL Editor

Go to: https://nvppeeaejybronzhklzu.supabase.co/project/_/sql/new

---

## Step 2: Copy & Run This SQL

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

---

## Step 3: Test

After running the SQL:
1. Refresh your app
2. Go to a game
3. Select players
4. Click "Start Game"
5. ✅ It should work now!

---

## What This Does

This updates the RLS policy to allow game session creators to insert score records for ALL players in their game (including friends and house members), not just themselves.

**Before:** Only inserting your own score was allowed
**After:** Session creator can insert scores for all players in that session

This is secure because it checks that you're the creator of the game session before allowing the insert.
