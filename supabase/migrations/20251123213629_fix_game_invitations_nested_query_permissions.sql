/*
  # Fix game_invitations Nested Query Permissions

  ## Summary
  Fixes 400 errors when querying game_invitations with nested joins to
  game_sessions, games, houses, and profiles tables.

  ## Changes
  1. Grant SELECT permissions on related tables for nested queries
  2. Update RLS policies to allow authenticated users to view related data
  3. Add missing indexes for performance

  ## Security
  - Maintains data privacy by only exposing data visible through invitations
  - Users can only see data related to their own invitations
*/

-- Ensure game_sessions has proper SELECT policies for invitation queries
DO $$
BEGIN
  -- Allow users to view game sessions they're invited to
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'game_sessions' 
    AND policyname = 'Users can view game sessions from invitations'
  ) THEN
    CREATE POLICY "Users can view game sessions from invitations"
      ON game_sessions
      FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT game_session_id 
          FROM game_invitations 
          WHERE invitee_id = auth.uid() OR inviter_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Ensure games table allows viewing games from invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'games' 
    AND policyname = 'Users can view games from invitations'
  ) THEN
    CREATE POLICY "Users can view games from invitations"
      ON games
      FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT game_id 
          FROM game_invitations 
          WHERE invitee_id = auth.uid() OR inviter_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Ensure houses table allows viewing houses from invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'houses' 
    AND policyname = 'Users can view houses from invitations'
  ) THEN
    CREATE POLICY "Users can view houses from invitations"
      ON houses
      FOR SELECT
      TO authenticated
      USING (
        id IN (
          SELECT house_id 
          FROM game_invitations 
          WHERE invitee_id = auth.uid() OR inviter_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add indexes for better performance on nested queries
CREATE INDEX IF NOT EXISTS idx_game_invitations_invitee_status_pending 
  ON game_invitations(invitee_id, status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_game_invitations_inviter 
  ON game_invitations(inviter_id);

CREATE INDEX IF NOT EXISTS idx_game_invitations_game_session 
  ON game_invitations(game_session_id) 
  WHERE game_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_game_invitations_created_desc 
  ON game_invitations(created_at DESC);

-- Add comment
COMMENT ON TABLE game_invitations IS 'Game invitations with proper RLS policies for nested queries';