/*
  # Fix Session Scores RLS for Friend Games
  
  1. Changes
    - Update INSERT policy to allow game creators to create scores for all players
    - Game creator (who creates the session) can insert scores for any player in that session
  
  2. Security
    - Only the session creator can insert scores
    - Players can still only view their own scores or scores in their houses
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can create their own session scores" ON session_scores;

-- Create new policy that allows session creators to insert scores for all players
CREATE POLICY "Session creators can create scores for all players"
  ON session_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE game_sessions.id = session_scores.session_id
      AND game_sessions.created_by = auth.uid()
    )
  );

-- Also add update policy for session creators to update scores
DROP POLICY IF EXISTS "Users can update their own session scores" ON session_scores;

CREATE POLICY "Session creators can update scores"
  ON session_scores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE game_sessions.id = session_scores.session_id
      AND game_sessions.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE game_sessions.id = session_scores.session_id
      AND game_sessions.created_by = auth.uid()
    )
  );
