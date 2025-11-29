/*
  # Add Soft Delete Functionality to Games
  
  ## Changes
  
  1. Add `deleted_at` column to games table
    - `deleted_at` (timestamptz, nullable) - When the game was soft deleted
  
  2. Add `deleted_by` column to games table
    - `deleted_by` (uuid, nullable) - Which user deleted the game
  
  ## Purpose
  
  This migration enables users to delete games from their house without losing
  historical game session data. Deleted games will:
  - Still preserve all game_sessions records
  - Not appear in active game lists
  - Maintain referential integrity
  
  ## Notes
  
  - Existing games will have NULL deleted_at (not deleted)
  - Queries should filter WHERE deleted_at IS NULL to show only active games
  - Game sessions will remain accessible even when parent game is soft deleted
*/

-- Add deleted_at column to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE games ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Add deleted_by column to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE games ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;
END $$;

-- Create index on deleted_at for efficient filtering
CREATE INDEX IF NOT EXISTS idx_games_deleted_at ON games(deleted_at) WHERE deleted_at IS NULL;

-- Drop existing select policy and recreate with deleted_at filter
DROP POLICY IF EXISTS "Users can view games in their houses" ON games;
DROP POLICY IF EXISTS "Users can view active games in their houses" ON games;

CREATE POLICY "Users can view active games in their houses"
  ON games FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
      AND house_members.user_id = auth.uid()
    )
  );
