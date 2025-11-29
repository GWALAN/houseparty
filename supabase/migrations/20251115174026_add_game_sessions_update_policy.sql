/*
  # Add UPDATE Policy for Game Sessions

  ## Problem
  Game sessions cannot be updated (marked as completed/cancelled) because
  there is no UPDATE policy defined. This causes games to stay in "active" 
  status forever and never appear in game history.

  ## Solution
  Add an UPDATE policy that allows:
  - Session creator to update their sessions
  - House members to update sessions in their house

  ## Security
  - Only authenticated users
  - Must be either the session creator OR a house member
  - Prevents unauthorized updates to other houses' sessions
*/

-- Add UPDATE policy for game_sessions
CREATE POLICY "Users can update game sessions they created or in their houses"
  ON game_sessions
  FOR UPDATE
  TO authenticated
  USING (
    -- User created this session OR user is a member of the house
    (created_by = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = game_sessions.house_id
      AND house_members.user_id = auth.uid()
    ))
  );