/*
  # Fix Game Session Premature Logging

  ## Problem
  1. Games appear in history before they start (with 0 wins)
  2. Games get logged twice - once when created, once when completed
  3. Duplicate session_scores entries exist for the same user+session
  4. completed_at timestamp might be set incorrectly during creation

  ## Solution
  1. Remove duplicate session_scores (keep only the latest one per user+session)
  2. Ensure completed_at is NULL by default and only set when game actually completes
  3. Add constraints to prevent future duplicates
  4. Update any existing sessions that have completed status but no completed_at

  ## Changes
  - Clean up duplicate session_scores
  - Set completed_at to NULL for sessions that are not completed
  - Add unique constraint to prevent duplicate session_scores
  - Add check constraint ensuring completed sessions always have completed_at
*/

-- Step 1: Delete duplicate session_scores, keeping only the most recent one per session+user
DELETE FROM session_scores
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY session_id, user_id 
             ORDER BY created_at DESC
           ) as rn
    FROM session_scores
  ) t
  WHERE rn > 1
);

-- Step 2: Fix any sessions that have completed status but no completed_at
UPDATE game_sessions
SET completed_at = ended_at
WHERE status = 'completed' 
  AND completed_at IS NULL 
  AND ended_at IS NOT NULL;

-- For sessions still missing completed_at, use created_at as fallback
UPDATE game_sessions
SET completed_at = created_at
WHERE status = 'completed' 
  AND completed_at IS NULL;

-- Step 3: Set completed_at to NULL for any non-completed sessions
UPDATE game_sessions
SET completed_at = NULL
WHERE status IN ('pending', 'active', 'cancelled')
  AND completed_at IS NOT NULL;

-- Step 4: Create unique index on session_scores to prevent duplicates
DROP INDEX IF EXISTS idx_session_scores_unique_user_session;
CREATE UNIQUE INDEX idx_session_scores_unique_user_session 
ON session_scores(session_id, user_id);

-- Step 5: Add check constraint to ensure completed sessions have completed_at
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'game_sessions_completed_at_check'
  ) THEN
    ALTER TABLE game_sessions
    ADD CONSTRAINT game_sessions_completed_at_check
    CHECK (
      (status = 'completed' AND completed_at IS NOT NULL) OR
      (status != 'completed')
    );
  END IF;
END $$;

COMMENT ON CONSTRAINT game_sessions_completed_at_check ON game_sessions IS 
'Ensures completed game sessions always have a completed_at timestamp';

COMMENT ON INDEX idx_session_scores_unique_user_session IS 
'Prevents duplicate score entries for the same user in the same game session';
