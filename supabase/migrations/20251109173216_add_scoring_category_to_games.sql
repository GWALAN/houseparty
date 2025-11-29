/*
  # Add scoring category to games table

  1. Changes
    - Add `scoring_category` text column to categorize scoring types
    - Categories: competitive (higher wins), speed (faster wins), endurance (longer wins), ranking (lower rank wins)
    - Set default to 'competitive' for existing games
  
  2. Notes
    - This helps organize scoring types into logical groups
    - Makes UI presentation clearer and reduces user confusion
    - Existing games will be migrated to 'competitive' category as safe default
*/

-- Add scoring_category column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scoring_category'
  ) THEN
    ALTER TABLE games ADD COLUMN scoring_category text DEFAULT 'competitive';
  END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN games.scoring_category IS 'Category of scoring: competitive (higher wins), speed (faster wins), endurance (longer wins), ranking (lower rank wins)';

-- Update existing games to set correct category based on their scoring_type
UPDATE games
SET scoring_category = CASE
  WHEN scoring_type IN ('points', 'wins', 'accuracy', 'reps', 'distance', 'weight', 'streak', 'ratio') THEN 'competitive'
  WHEN scoring_type IN ('time', 'reaction_time') THEN 'speed'
  WHEN scoring_type = 'duration' THEN 'endurance'
  WHEN scoring_type = 'rank' THEN 'ranking'
  ELSE 'competitive'
END
WHERE scoring_category IS NULL OR scoring_category = 'competitive';
