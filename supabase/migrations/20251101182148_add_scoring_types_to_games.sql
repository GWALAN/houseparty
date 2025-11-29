/*
  # Add scoring types to games table

  1. Changes
    - Add `scoring_type` column to track the type of measurement
      Options: wins, time, distance, points, weight, accuracy, reps, streak, duration, ratio, reaction_time, rank
    - Add `scoring_unit` column for display unit (e.g., "seconds", "meters", "kg", "%")
    - Add `lower_is_better` boolean to indicate scoring direction
    - Set default values for existing games
    
  2. Notes
    - For time-based and rank-based games, lower scores are better
    - For points, distance, reps, etc., higher scores are better
*/

-- Add scoring_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scoring_type'
  ) THEN
    ALTER TABLE games ADD COLUMN scoring_type text DEFAULT 'points' 
    CHECK (scoring_type IN ('wins', 'time', 'distance', 'points', 'weight', 'accuracy', 'reps', 'streak', 'duration', 'ratio', 'reaction_time', 'rank'));
  END IF;
END $$;

-- Add scoring_unit column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scoring_unit'
  ) THEN
    ALTER TABLE games ADD COLUMN scoring_unit text DEFAULT 'points';
  END IF;
END $$;

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

-- Update existing games to have proper defaults
UPDATE games 
SET scoring_type = 'points', 
    scoring_unit = 'points', 
    lower_is_better = false 
WHERE scoring_type IS NULL;