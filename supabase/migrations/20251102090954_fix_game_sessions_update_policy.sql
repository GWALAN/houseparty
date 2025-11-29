/*
  # Fix Game Sessions Update Policy
  
  1. Changes
    - Add UPDATE policy on game_sessions table to allow session creators to update their sessions
    - This allows games to be properly marked as 'completed' with ended_at timestamp
    - Also allows cancellation of games by the creator
  
  2. Security
    - Only the user who created the session (created_by field) can update it
    - Policy checks that auth.uid() matches the created_by field
    - Maintains security while allowing necessary game state updates
*/

-- Add UPDATE policy for game_sessions
CREATE POLICY "Session creators can update their sessions"
  ON game_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
