/*
  # Fix Missing Columns in session_scores Table

  ## Summary
  This migration adds the missing scoring columns to the `session_scores` table that are required
  for the atomic game completion function and various scoring types.

  ## Changes Made
  
  1. **New Columns Added to session_scores**
     - `accuracy_hits` (integer, nullable) - Number of successful hits/attempts for accuracy-based games
     - `accuracy_attempts` (integer, nullable) - Total number of attempts for accuracy-based games
     - `ratio_numerator` (integer, nullable) - Numerator value for ratio-based scoring
     - `ratio_denominator` (integer, nullable) - Denominator value for ratio-based scoring
     - `input_metadata` (jsonb, nullable) - Additional metadata for custom scoring inputs

  ## Security
  - RLS policies remain unchanged - existing policies continue to apply
  - No data is affected by this schema change

  ## Notes
  - These columns support various game scoring types (accuracy, ratio, etc.)
  - All columns are nullable to maintain backward compatibility
  - Existing rows will have NULL values for these new columns
*/

-- Add missing columns to session_scores table
DO $$ 
BEGIN
  -- Add accuracy_hits column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_scores' AND column_name = 'accuracy_hits'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN accuracy_hits integer;
    COMMENT ON COLUMN session_scores.accuracy_hits IS 'Number of successful hits for accuracy-based scoring';
  END IF;

  -- Add accuracy_attempts column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_scores' AND column_name = 'accuracy_attempts'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN accuracy_attempts integer;
    COMMENT ON COLUMN session_scores.accuracy_attempts IS 'Total number of attempts for accuracy-based scoring';
  END IF;

  -- Add ratio_numerator column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_scores' AND column_name = 'ratio_numerator'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN ratio_numerator integer;
    COMMENT ON COLUMN session_scores.ratio_numerator IS 'Numerator value for ratio-based scoring';
  END IF;

  -- Add ratio_denominator column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_scores' AND column_name = 'ratio_denominator'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN ratio_denominator integer;
    COMMENT ON COLUMN session_scores.ratio_denominator IS 'Denominator value for ratio-based scoring';
  END IF;

  -- Add input_metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_scores' AND column_name = 'input_metadata'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN input_metadata jsonb;
    COMMENT ON COLUMN session_scores.input_metadata IS 'Additional metadata for custom scoring inputs';
  END IF;
END $$;

-- Create indexes for better query performance on these columns
CREATE INDEX IF NOT EXISTS idx_session_scores_accuracy 
  ON session_scores(session_id, accuracy_hits, accuracy_attempts)
  WHERE accuracy_hits IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_scores_ratio 
  ON session_scores(session_id, ratio_numerator, ratio_denominator)
  WHERE ratio_numerator IS NOT NULL;

-- Verify the columns exist
DO $$
DECLARE
  missing_columns text[];
BEGIN
  SELECT array_agg(col)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY['accuracy_hits', 'accuracy_attempts', 'ratio_numerator', 'ratio_denominator', 'input_metadata']) AS col
  ) cols
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' AND column_name = col
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Migration failed: Missing columns: %', array_to_string(missing_columns, ', ');
  END IF;

  RAISE NOTICE 'All required columns successfully added to session_scores table';
END $$;