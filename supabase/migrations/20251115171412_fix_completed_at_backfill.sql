/*
  # Fix Game History Missing Data - Backfill completed_at

  ## Problem
  Game sessions were being updated with `ended_at` but not `completed_at`.
  The `get_house_game_history` function relies on `completed_at` to:
  1. Filter completed games
  2. Order games by completion time

  This caused completed games to not appear in the game history.

  ## Solution
  1. Backfill `completed_at` for all completed game sessions that have `ended_at` but null `completed_at`
  2. For sessions marked as completed but missing both timestamps, set them to the session's created_at
  3. Ensure future games set both timestamps (handled in application code)

  ## Changes
  - Update existing completed sessions to have completed_at = ended_at where completed_at is null
  - Update sessions with status='completed' but no timestamps to use created_at as fallback
*/

-- Backfill completed_at for sessions that have ended_at but not completed_at
UPDATE game_sessions
SET completed_at = ended_at
WHERE status = 'completed'
  AND ended_at IS NOT NULL
  AND completed_at IS NULL;

-- For completed sessions missing both timestamps, use created_at as fallback
UPDATE game_sessions
SET
  completed_at = created_at,
  ended_at = created_at
WHERE status = 'completed'
  AND completed_at IS NULL
  AND ended_at IS NULL;

-- Add a check to log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM game_sessions
  WHERE status = 'completed' AND completed_at IS NOT NULL;

  RAISE NOTICE 'Total completed game sessions with completed_at: %', updated_count;
END $$;

COMMENT ON COLUMN game_sessions.completed_at IS 'Timestamp when game was marked as completed. Used by game history queries.';
COMMENT ON COLUMN game_sessions.ended_at IS 'Timestamp when game ended. Can be same as completed_at.';