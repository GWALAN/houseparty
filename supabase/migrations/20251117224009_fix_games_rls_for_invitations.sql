/*
  # Fix Games RLS for Invitations
  
  ## Summary
  Allows users to view games they've been invited to play, even if they're not
  yet members of the house. This fixes the "Unknown Game" issue in invitations.
  
  ## Changes
  - Add new RLS policy allowing users to view games they're invited to
  
  ## Security
  - Only grants SELECT access for games with pending invitations
  - Does not allow INSERT, UPDATE, or DELETE
  - User must have a pending invitation to play that specific game
*/

-- Allow users to view games they've been invited to play
CREATE POLICY "Users can view games they're invited to"
  ON games
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM game_invitations
      WHERE game_invitations.game_id = games.id
        AND game_invitations.invitee_id = auth.uid()
        AND game_invitations.status = 'pending'
    )
  );
