/*
  # Fix Session Scores INSERT Policy

  1. Problem
    - Session creators cannot insert scores for players in their games
    - The existing WITH CHECK policy might not properly reference the session_id being inserted
    - This causes RLS violation when starting a game

  2. Solution
    - Drop and recreate INSERT policy with clearer logic
    - Use NEW.session_id reference pattern that works during INSERT
    - Allow session creator to insert scores for any player in their session

  3. Security
    - Only the session creator can insert scores
    - Maintains data integrity by checking game_sessions.created_by
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Session creators can create scores for all players" ON session_scores;
DROP POLICY IF EXISTS "Users can create their own session scores" ON session_scores;

-- Create new INSERT policy that allows session creators to insert scores for all players
-- Note: In WITH CHECK during INSERT, bare column names (without table prefix) reference the NEW values
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
