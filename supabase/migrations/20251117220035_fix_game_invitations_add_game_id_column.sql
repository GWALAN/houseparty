/*
  # Fix game_invitations table - Add missing game_id column

  1. Changes
    - Add game_id column to game_invitations table
    - Add foreign key constraint to games table
    - Add index for performance

  2. Notes
    - The code tries to insert game_id but the column doesn't exist
    - This is causing silent insert failures
*/

-- Add game_id column to game_invitations
ALTER TABLE game_invitations 
ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES games(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_game_invitations_game_id ON game_invitations(game_id);

-- Also add responded_at column if it doesn't exist (from the migration but might be missing)
ALTER TABLE game_invitations 
ADD COLUMN IF NOT EXISTS responded_at timestamptz;
