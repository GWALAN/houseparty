/*
  # Add Missing Game Columns for Scoring Types

  ## Summary
  Adds missing columns to the games table that are required for different
  scoring types (distance, weight, accuracy).

  ## Changes
  1. Add `distance_unit` column for distance-based games (meters, km, miles, etc.)
  2. Add `weight_unit` column for weight-based games (kg, lbs)
  3. Add `max_attempts` column for accuracy-based games
  4. Add `scoring_category` column if missing
  5. Add `game_emoji` column for game icons

  ## Security
  - Maintains existing RLS policies
  - No changes to access controls
*/

-- Add distance_unit column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'distance_unit'
  ) THEN
    ALTER TABLE games ADD COLUMN distance_unit text;
  END IF;
END $$;

-- Add weight_unit column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'weight_unit'
  ) THEN
    ALTER TABLE games ADD COLUMN weight_unit text;
  END IF;
END $$;

-- Add max_attempts column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE games ADD COLUMN max_attempts integer;
  END IF;
END $$;

-- Add scoring_category column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'scoring_category'
  ) THEN
    ALTER TABLE games ADD COLUMN scoring_category text;
  END IF;
END $$;

-- Add game_emoji column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'game_emoji'
  ) THEN
    ALTER TABLE games ADD COLUMN game_emoji text DEFAULT '🎮';
  END IF;
END $$;

-- Add check constraints for valid units
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'games_distance_unit_check'
  ) THEN
    ALTER TABLE games 
    ADD CONSTRAINT games_distance_unit_check 
    CHECK (distance_unit IS NULL OR distance_unit IN ('meters', 'kilometers', 'miles', 'yards', 'feet'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE constraint_name = 'games_weight_unit_check'
  ) THEN
    ALTER TABLE games 
    ADD CONSTRAINT games_weight_unit_check 
    CHECK (weight_unit IS NULL OR weight_unit IN ('kg', 'lbs'));
  END IF;
END $$;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_games_house_scoring_type 
  ON games(house_id, scoring_type) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_games_created_by 
  ON games(created_by);

-- Add comments
COMMENT ON COLUMN games.distance_unit IS 'Unit for distance measurements: meters, kilometers, miles, yards, feet';
COMMENT ON COLUMN games.weight_unit IS 'Unit for weight measurements: kg, lbs';
COMMENT ON COLUMN games.max_attempts IS 'Maximum attempts for accuracy-based games';
COMMENT ON COLUMN games.scoring_category IS 'Category of scoring: competitive, measurement, accuracy, time';
COMMENT ON COLUMN games.game_emoji IS 'Emoji icon for the game';