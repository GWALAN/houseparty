/*
  # Add Automatic Winner and Placement Calculation

  ## Changes
  1. Create trigger function to automatically calculate winners and placements
  2. Runs whenever session_scores are updated
  3. Calculates based on game's scoring rules (higher/lower is better)
  4. Updates is_winner and placement fields automatically

  ## Impact
  - Winners will always be correctly identified
  - Placements will always be calculated
  - Win rates will calculate correctly
  - No manual intervention needed
*/

-- Create function to calculate winners and placements for a session
CREATE OR REPLACE FUNCTION calculate_session_winners()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game RECORD;
  v_session_id uuid;
BEGIN
  -- Get the session_id from the trigger (works for INSERT, UPDATE, DELETE)
  IF TG_OP = 'DELETE' THEN
    v_session_id := OLD.session_id;
  ELSE
    v_session_id := NEW.session_id;
  END IF;

  -- Get game settings to know if lower or higher is better
  SELECT g.lower_is_better INTO v_game
  FROM game_sessions gs
  JOIN games g ON g.id = gs.game_id
  WHERE gs.id = v_session_id;

  IF v_game IS NULL THEN
    RETURN NEW;
  END IF;

  -- Reset all winners for this session
  UPDATE session_scores
  SET is_winner = false
  WHERE session_id = v_session_id;

  -- Calculate placements and set winners based on scoring rules
  WITH ranked_scores AS (
    SELECT 
      id,
      user_id,
      score,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE 
            WHEN v_game.lower_is_better THEN score
            ELSE -score
          END ASC
      ) as placement
    FROM session_scores
    WHERE session_id = v_session_id
      AND score IS NOT NULL
  )
  UPDATE session_scores ss
  SET 
    placement = rs.placement,
    is_winner = (rs.placement = 1)
  FROM ranked_scores rs
  WHERE ss.id = rs.id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_winners_on_score_change ON session_scores;

-- Create trigger that fires after INSERT, UPDATE, or DELETE on session_scores
CREATE TRIGGER calculate_winners_on_score_change
  AFTER INSERT OR UPDATE OF score OR DELETE ON session_scores
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_winners();

-- Recalculate winners and placements for all existing completed sessions
DO $$
DECLARE
  v_session RECORD;
  v_game RECORD;
BEGIN
  FOR v_session IN 
    SELECT DISTINCT gs.id as session_id
    FROM game_sessions gs
    WHERE gs.status = 'completed'
  LOOP
    -- Get game settings
    SELECT g.lower_is_better INTO v_game
    FROM game_sessions gs
    JOIN games g ON g.id = gs.game_id
    WHERE gs.id = v_session.session_id;

    -- Reset winners
    UPDATE session_scores
    SET is_winner = false
    WHERE session_id = v_session.session_id;

    -- Calculate placements and winners
    WITH ranked_scores AS (
      SELECT 
        id,
        score,
        ROW_NUMBER() OVER (
          ORDER BY 
            CASE 
              WHEN v_game.lower_is_better THEN score
              ELSE -score
            END ASC
        ) as new_placement
      FROM session_scores
      WHERE session_id = v_session.session_id
        AND score IS NOT NULL
    )
    UPDATE session_scores ss
    SET 
      placement = rs.new_placement,
      is_winner = (rs.new_placement = 1)
    FROM ranked_scores rs
    WHERE ss.id = rs.id;
  END LOOP;
END $$;

COMMENT ON FUNCTION calculate_session_winners IS 'Automatically calculates winners and placements for a game session based on scores';