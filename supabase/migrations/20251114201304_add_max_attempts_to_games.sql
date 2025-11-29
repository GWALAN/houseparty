/*
  # Add Max Attempts for Accuracy Games

  1. Changes
    - Add max_attempts column to games table for accuracy-based scoring
    - This stores the fixed number of attempts set during game creation
    - Players will then increment hits with a + button during the game
    
  2. Notes
    - Only used for accuracy scoring type
    - Allows for cleaner UX where attempts are pre-set
*/

-- Add max_attempts column to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE games ADD COLUMN max_attempts integer;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN games.max_attempts IS 'Fixed number of attempts for accuracy-based games. Players increment hits with + button.';
