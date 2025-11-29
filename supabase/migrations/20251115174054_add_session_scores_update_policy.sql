/*
  # Add UPDATE Policy for Session Scores

  ## Problem
  Session scores cannot be updated during gameplay or when games end because
  there is no UPDATE policy defined. This causes:
  - Scores to stay at 0 during gameplay
  - Accuracy/ratio metadata never gets saved
  - Placement and winner status never gets set

  ## Solution
  Add an UPDATE policy that allows:
  - Session creator to update all scores in their session
  - Players to update their own scores

  ## Security
  - Only authenticated users
  - Must be either the session creator OR the player whose score is being updated
  - Prevents unauthorized score manipulation
*/

-- Add UPDATE policy for session_scores
CREATE POLICY "Session creators and players can update scores"
  ON session_scores
  FOR UPDATE
  TO authenticated
  USING (
    -- User is updating their own score OR user created the session
    (user_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM game_sessions
      WHERE game_sessions.id = session_scores.session_id
      AND game_sessions.created_by = auth.uid()
    ))
  );