/*
  # Add placement column to session_scores table

  1. Changes
    - Add `placement` integer column to track player ranking in each game session
    - Default value is NULL (will be set when game ends)
  
  2. Notes
    - Placement represents finish position: 1 = first place, 2 = second place, etc.
    - Used for leaderboards and statistics
*/

-- Add placement column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' AND column_name = 'placement'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN placement integer DEFAULT NULL;
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN session_scores.placement IS 'Player finish position in the game: 1 = first place, 2 = second place, etc.';
