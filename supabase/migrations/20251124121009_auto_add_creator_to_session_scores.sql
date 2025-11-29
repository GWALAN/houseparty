/*
  # Auto-Add Creator to Session Scores

  ## Summary
  Ensures the game creator always has a session_scores entry when a game session is created.
  This prevents issues where the creator isn't included in leaderboards if they forget to
  manually select themselves in the UI.

  ## Changes
  1. **Create Trigger Function**
     - Automatically inserts a session_scores row for the creator (created_by user)
     - Runs when a new game_session is created
     - Uses ON CONFLICT to prevent duplicate entries
     - Acts as a safety net for the frontend auto-selection

  2. **Benefits**
     - Creator always appears in game history and leaderboards
     - Fixes "only seeing friends" bug
     - Works even if frontend selection logic has issues
     - No manual intervention required
*/

-- Create function to auto-add creator to session scores
CREATE OR REPLACE FUNCTION auto_add_creator_to_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the creator (created_by user) has a session_scores entry
  -- This guarantees they appear in leaderboards and game history
  INSERT INTO session_scores (session_id, user_id, score)
  VALUES (NEW.id, NEW.created_by, 0)
  ON CONFLICT (session_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_creator_in_session ON game_sessions;

-- Create trigger that fires after a game session is inserted
CREATE TRIGGER ensure_creator_in_session
  AFTER INSERT ON game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_creator_to_session();

-- Backfill: Add creator to existing sessions where they're missing
DO $$
DECLARE
  v_session RECORD;
  v_missing_count INTEGER := 0;
BEGIN
  FOR v_session IN
    SELECT gs.id as session_id, gs.created_by as creator_id
    FROM game_sessions gs
    WHERE NOT EXISTS (
      SELECT 1 FROM session_scores ss
      WHERE ss.session_id = gs.id
        AND ss.user_id = gs.created_by
    )
  LOOP
    -- Add missing creator entry
    INSERT INTO session_scores (session_id, user_id, score)
    VALUES (v_session.session_id, v_session.creator_id, 0)
    ON CONFLICT (session_id, user_id) DO NOTHING;

    v_missing_count := v_missing_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled % missing creator entries', v_missing_count;
END $$;

COMMENT ON FUNCTION auto_add_creator_to_session IS 'Automatically ensures game creator has a session_scores entry for leaderboard visibility';