/*
  # Add Pending Status to Game Sessions

  ## Changes
  - Adds 'pending' status to game_sessions status constraint
  - Ensures 'cancelled' status is included
  - This allows games to be in pending state while waiting for player acceptance
  - Cancelled games can be filtered out from queries

  ## Valid Statuses
  - pending: Waiting for all players to accept invitations
  - active: Game is currently being played (scores being entered)
  - ongoing: Multi-day game that's in progress
  - completed: Game finished with final scores
  - cancelled: Game was deleted/cancelled by admin
*/

-- Drop existing status constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'game_sessions' AND constraint_name = 'game_sessions_status_check'
  ) THEN
    ALTER TABLE game_sessions DROP CONSTRAINT game_sessions_status_check;
  END IF;
END $$;

-- Add updated status constraint with pending and cancelled
ALTER TABLE game_sessions
  ADD CONSTRAINT game_sessions_status_check
  CHECK (status IN ('pending', 'active', 'ongoing', 'completed', 'cancelled'));

-- Update default status to 'pending' for new game sessions
ALTER TABLE game_sessions
  ALTER COLUMN status SET DEFAULT 'pending';

-- Add index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_game_sessions_status
  ON game_sessions(status);

-- Update history function to exclude cancelled games
DROP FUNCTION IF EXISTS get_house_game_history(uuid);

CREATE OR REPLACE FUNCTION get_house_game_history(house_id_param uuid)
RETURNS TABLE (
  session_id uuid,
  game_id uuid,
  game_name text,
  game_emoji text,
  game_type text,
  scoring_type text,
  scoring_unit text,
  lower_is_better boolean,
  distance_unit text,
  weight_unit text,
  max_attempts integer,
  completed_at timestamptz,
  participants jsonb,
  winner_id uuid,
  winner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is a member of this house (with indexed lookup)
  IF NOT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = house_id_param
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this house';
  END IF;

  RETURN QUERY
  WITH completed_sessions AS (
    -- Pre-filter to only completed sessions (exclude cancelled) for this house
    SELECT gs.id, gs.game_id, gs.completed_at
    FROM game_sessions gs
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
    ORDER BY gs.completed_at DESC
    LIMIT 100
  ),
  session_participants AS (
    SELECT
      ss.session_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', ss.user_id,
          'nickname', COALESCE(hm.nickname, ups.display_name, p.username, 'Player'),
          'username', COALESCE(p.username, 'Player'),
          'score', ss.score,
          'placement', ss.placement,
          'is_winner', ss.is_winner,
          'accuracy_hits', ss.accuracy_hits,
          'accuracy_attempts', ss.accuracy_attempts,
          'ratio_numerator', ss.ratio_numerator,
          'ratio_denominator', ss.ratio_denominator,
          'input_metadata', ss.input_metadata,
          'profile_photo_url', ups.profile_photo_url,
          'equipped_kit_colors', hk.color_scheme
        ) ORDER BY ss.placement ASC NULLS LAST, ss.score DESC
      ) as participants_data
    FROM session_scores ss
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = house_id_param
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    WHERE ss.session_id IN (SELECT id FROM completed_sessions)
    GROUP BY ss.session_id
  ),
  session_winners AS (
    SELECT DISTINCT ON (ss.session_id)
      ss.session_id,
      ss.user_id as winner_user_id,
      COALESCE(hm.nickname, ups.display_name, p.username) as winner_display_name
    FROM session_scores ss
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = house_id_param
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    WHERE ss.is_winner = true
    AND ss.session_id IN (SELECT id FROM completed_sessions)
  )
  SELECT
    cs.id as session_id,
    g.id as game_id,
    g.name as game_name,
    g.game_emoji,
    g.game_type,
    g.scoring_type,
    g.scoring_unit,
    COALESCE(g.lower_is_better, false) as lower_is_better,
    g.distance_unit,
    g.weight_unit,
    g.max_attempts,
    cs.completed_at,
    sp.participants_data as participants,
    sw.winner_user_id as winner_id,
    sw.winner_display_name as winner_name
  FROM completed_sessions cs
  INNER JOIN games g ON g.id = cs.game_id
  LEFT JOIN session_participants sp ON sp.session_id = cs.id
  LEFT JOIN session_winners sw ON sw.session_id = cs.id
  ORDER BY cs.completed_at DESC;
END;
$$;
