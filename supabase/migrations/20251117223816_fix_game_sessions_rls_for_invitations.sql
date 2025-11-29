/*
  # Fix Game Sessions RLS for Invitations
  
  ## Summary
  Allows users to view game sessions they've been invited to, even if they're not
  yet members of the house. This fixes the issue where invited users can't see
  their invitations because the game_sessions join returns null.
  
  ## Changes
  - Add new RLS policy allowing users to view game sessions they're invited to
  
  ## Security
  - Only grants SELECT access for sessions with pending invitations
  - Does not allow INSERT, UPDATE, or DELETE
  - User must have a pending invitation to that specific session
*/

-- Allow users to view game sessions they've been invited to
CREATE POLICY "Users can view game sessions they're invited to"
  ON game_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM game_invitations
      WHERE game_invitations.game_session_id = game_sessions.id
        AND game_invitations.invitee_id = auth.uid()
        AND game_invitations.status = 'pending'
    )
  );
