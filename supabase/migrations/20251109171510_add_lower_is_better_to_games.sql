/*
  # Add lower_is_better and highest_score columns to games table

  1. Changes
    - Add `lower_is_better` boolean column to games table (default false = higher is better)
    - Add `highest_score` numeric column to track the highest/best score in the game
    - Both columns are nullable to support legacy games
  
  2. Notes
    - `lower_is_better` = true for games like golf, time trials where lower is better
    - `lower_is_better` = false (default) for games where higher scores win
    - `highest_score` stores the best score achieved in the game for quick reference
*/

-- Add lower_is_better column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'lower_is_better'
  ) THEN
    ALTER TABLE games ADD COLUMN lower_is_better boolean DEFAULT false;
  END IF;
END $$;

-- Add highest_score column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'highest_score'
  ) THEN
    ALTER TABLE games ADD COLUMN highest_score numeric(10, 2);
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN games.lower_is_better IS 'If true, lower scores are better (e.g., golf, time trials). If false, higher scores are better (e.g., points, wins).';
COMMENT ON COLUMN games.highest_score IS 'The best score achieved in this game. For lower_is_better=true, this is the lowest score. For lower_is_better=false, this is the highest score.';
