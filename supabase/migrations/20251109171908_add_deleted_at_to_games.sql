/*
  # Add soft delete support to games table

  1. Changes
    - Add `deleted_at` timestamp column for soft deletes
    - Games with a non-null `deleted_at` are considered deleted
    - This allows for game recovery and maintains data integrity
  
  2. Notes
    - Soft deletes are preferred over hard deletes to maintain historical data
    - Queries should filter with `.is('deleted_at', null)` to exclude deleted games
*/

-- Add deleted_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE games ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN games.deleted_at IS 'Timestamp when the game was soft-deleted. NULL means the game is active.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_games_deleted_at ON games(deleted_at) WHERE deleted_at IS NULL;
