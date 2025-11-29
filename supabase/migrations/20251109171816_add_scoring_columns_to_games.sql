/*
  # Add scoring columns to games table

  1. Changes
    - Add `scoring_type` text column to store the type of scoring (points, wins, time, distance, etc.)
    - Add `scoring_unit` text column to store the unit of measurement (pts, wins, seconds, meters, etc.)
    - Add `game_emoji` text column to store optional emoji for the game
  
  2. Notes
    - `scoring_type` examples: 'points', 'wins', 'time', 'distance', 'weight', 'accuracy', 'reps', 'streak', 'duration'
    - `scoring_unit` examples: 'pts', 'wins', 'seconds', 'meters', 'kg', '%', 'reps', 'streak', 'seconds'
    - These columns work together with `lower_is_better` to define game scoring logic
*/

-- Add scoring_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scoring_type'
  ) THEN
    ALTER TABLE games ADD COLUMN scoring_type text DEFAULT 'points';
  END IF;
END $$;

-- Add scoring_unit column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scoring_unit'
  ) THEN
    ALTER TABLE games ADD COLUMN scoring_unit text DEFAULT 'pts';
  END IF;
END $$;

-- Add game_emoji column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'game_emoji'
  ) THEN
    ALTER TABLE games ADD COLUMN game_emoji text;
  END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN games.scoring_type IS 'Type of scoring: points, wins, time, distance, weight, accuracy, reps, streak, duration';
COMMENT ON COLUMN games.scoring_unit IS 'Unit of measurement: pts, wins, seconds, meters, kg, %, reps, streak, seconds';
COMMENT ON COLUMN games.game_emoji IS 'Optional emoji to represent the game';
