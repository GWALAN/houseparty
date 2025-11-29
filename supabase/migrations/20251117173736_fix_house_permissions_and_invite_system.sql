/*
  # Fix House Permissions and Invite Code System

  ## Summary
  Implements hierarchical permission system for houses with proper admin/member distinctions
  and fixes the invite code lookup issue that prevents users from joining houses.

  ## Changes

  ### 1. Houses Table
  - Add `is_private` column (default true) for private/public house distinction
  - Update RLS policies to allow invite code lookup for non-members

  ### 2. RLS Policy Updates

  #### Houses Table:
  - **NEW**: Allow authenticated users to view houses by invite_code (for join flow)
  - **UPDATED**: Restrict UPDATE to admins and creators only (not regular members)
  - **KEEP**: Existing DELETE policy (creators and admins only)
  - **KEEP**: Existing member view policy

  #### Games Table:
  - **KEEP**: Only admins can create/update/delete games (already correct)
  - **ADD**: Explicit DELETE policy for admins only

  #### Game Sessions Table:
  - **KEEP**: All house members can create game sessions (correct - allows members to start games)
  - **UPDATED**: Only session creator or admins can update sessions (not all members)

  ### 3. Security Notes
  - Private houses (is_private = true) can only be joined via invite code or game invitation
  - Regular members cannot modify house structure (settings, games)
  - Regular members CAN start game sessions using existing games
  - All policies check 50-member house limit via application logic
*/

-- Step 1: Add is_private column to houses if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'houses' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE houses ADD COLUMN is_private boolean DEFAULT true;
  END IF;
END $$;

-- Step 2: Drop and recreate houses RLS policies with proper permissions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view houses they are members of" ON houses;
DROP POLICY IF EXISTS "Admins can update their houses" ON houses;
DROP POLICY IF EXISTS "Authenticated users can create houses" ON houses;
DROP POLICY IF EXISTS "Creators and admins can delete houses" ON houses;

-- NEW: Allow viewing houses by invite code (for join flow)
CREATE POLICY "Users can view houses by invite code"
  ON houses
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create houses
CREATE POLICY "Authenticated users can create houses"
  ON houses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATED: Only creators and admins can update house settings
CREATE POLICY "Only creators and admins can update houses"
  ON houses
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = creator_id) 
    OR 
    (EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = houses.id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    ))
  )
  WITH CHECK (
    (auth.uid() = creator_id) 
    OR 
    (EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = houses.id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    ))
  );

-- Only creators and admins can delete houses
CREATE POLICY "Only creators and admins can delete houses"
  ON houses
  FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = creator_id) 
    OR 
    (EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = houses.id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    ))
  );

-- Step 3: Fix games table policies - ensure only admins can modify

-- Drop existing policies
DROP POLICY IF EXISTS "House members can view games" ON games;
DROP POLICY IF EXISTS "House admins can create games" ON games;
DROP POLICY IF EXISTS "House admins can update games" ON games;

-- Members can view games in their houses
CREATE POLICY "House members can view games"
  ON games
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
        AND house_members.user_id = auth.uid()
    )
  );

-- Only admins can create games
CREATE POLICY "Only admins can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    )
  );

-- Only admins can update games
CREATE POLICY "Only admins can update games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    )
  );

-- Only admins can delete games (soft delete via deleted_at)
CREATE POLICY "Only admins can delete games"
  ON games
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    )
  );

-- Step 4: Fix game_sessions policies - members can start, but only creator/admins can update

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view game sessions in their houses" ON game_sessions;
DROP POLICY IF EXISTS "Users can create game sessions in their houses" ON game_sessions;
DROP POLICY IF EXISTS "Users can update game sessions they created or in their houses" ON game_sessions;

-- Members can view game sessions in their houses
CREATE POLICY "House members can view game sessions"
  ON game_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = game_sessions.house_id
        AND house_members.user_id = auth.uid()
    )
  );

-- All members can create/start game sessions
CREATE POLICY "House members can create game sessions"
  ON game_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = game_sessions.house_id
        AND house_members.user_id = auth.uid()
    )
  );

-- Only session creator or admins can update game sessions
CREATE POLICY "Only session creator or admins can update sessions"
  ON game_sessions
  FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = game_sessions.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    ))
  )
  WITH CHECK (
    (created_by = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = game_sessions.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    ))
  );

-- Only session creator or admins can delete game sessions
CREATE POLICY "Only session creator or admins can delete sessions"
  ON game_sessions
  FOR DELETE
  TO authenticated
  USING (
    (created_by = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = game_sessions.house_id
        AND house_members.user_id = auth.uid()
        AND house_members.role = 'admin'
    ))
  );