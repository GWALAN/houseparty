/*
  # Add Realistic Scoring System Support

  1. Schema Changes
    - Add accuracy_hits and accuracy_attempts to session_scores for raw accuracy data
    - Add ratio_numerator and ratio_denominator to session_scores for raw ratio data
    - Add distance_unit and weight_unit to games table for unit preferences
    - Change score column from integer to numeric for decimal support
    - Add input_metadata jsonb column for additional raw input context
    
  2. Unit Support
    - distance_unit options: 'meters', 'yards', 'feet' (stores in meters canonically)
    - weight_unit options: 'kg', 'lb' (stores in kg canonically)
    
  3. Tie Support
    - placement column already exists and supports ties (multiple players can have same placement)
    
  4. Notes
    - All scores stored in canonical base units (meters, kg) for consistent querying
    - Display units preserved as metadata for historical accuracy
    - Derived metrics (accuracy %, ratio decimal) calculated from raw inputs
*/

-- Update session_scores to change score from integer to numeric for decimal support
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' 
    AND column_name = 'score' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE session_scores ALTER COLUMN score TYPE numeric USING score::numeric;
  END IF;
END $$;

-- Add accuracy input columns to session_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' AND column_name = 'accuracy_hits'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN accuracy_hits integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' AND column_name = 'accuracy_attempts'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN accuracy_attempts integer;
  END IF;
END $$;

-- Add ratio input columns to session_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' AND column_name = 'ratio_numerator'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN ratio_numerator numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' AND column_name = 'ratio_denominator'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN ratio_denominator numeric;
  END IF;
END $$;

-- Add input metadata column to session_scores for additional context
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' AND column_name = 'input_metadata'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN input_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add distance_unit column to games
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'distance_unit'
  ) THEN
    ALTER TABLE games ADD COLUMN distance_unit text 
    CHECK (distance_unit IN ('meters', 'yards', 'feet'));
  END IF;
END $$;

-- Add weight_unit column to games
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'weight_unit'
  ) THEN
    ALTER TABLE games ADD COLUMN weight_unit text 
    CHECK (weight_unit IN ('kg', 'lb'));
  END IF;
END $$;

-- Set default units for existing games based on scoring_type
UPDATE games 
SET distance_unit = 'meters' 
WHERE scoring_type = 'distance' AND distance_unit IS NULL;

UPDATE games 
SET weight_unit = 'kg' 
WHERE scoring_type = 'weight' AND weight_unit IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN session_scores.accuracy_hits IS 'Number of successful hits/attempts for accuracy-based scoring';
COMMENT ON COLUMN session_scores.accuracy_attempts IS 'Total number of attempts for accuracy-based scoring. Score = (hits / attempts) * 100';
COMMENT ON COLUMN session_scores.ratio_numerator IS 'Numerator value for ratio-based scoring';
COMMENT ON COLUMN session_scores.ratio_denominator IS 'Denominator value for ratio-based scoring. Score = numerator / denominator';
COMMENT ON COLUMN session_scores.input_metadata IS 'Additional context about score input (original units, timestamps, etc.)';
COMMENT ON COLUMN games.distance_unit IS 'Display unit for distance-based games. Values stored canonically in meters.';
COMMENT ON COLUMN games.weight_unit IS 'Display unit for weight-based games. Values stored canonically in kilograms.';
