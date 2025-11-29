/*
  # Add Scoring Fields to Game History Function

  ## Problem
  The `get_house_game_history` function is missing critical scoring-related fields
  that the frontend needs to properly display game results:
  - scoring_type
  - scoring_unit
  - lower_is_better
  - distance_unit
  - weight_unit
  - max_attempts

  Without these fields, the frontend can't properly format scores or determine
  how to display accuracy/ratio/measurement data.

  ## Solution
  Update the function to include all scoring-related fields from the games table.

  ## Impact
  - Game history will now include complete scoring configuration
  - Frontend can properly format and display all game types
  - No breaking changes - only adds additional fields
*/

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
  -- Verify user is a member of this house
  IF NOT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = house_id_param
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this house';
  END IF;

  RETURN QUERY
  WITH session_participants AS (
    SELECT
      ss.session_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', ss.user_id,
          'nickname', hm.nickname,
          'username', p.username,
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
      ) as participants_data,
      MAX(CASE WHEN ss.is_winner THEN ss.user_id END) as winner_user_id,
      MAX(CASE WHEN ss.is_winner THEN hm.nickname END) as winner_display_name
    FROM session_scores ss
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = house_id_param
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    WHERE ss.session_id IN (
      SELECT gs.id
      FROM game_sessions gs
      WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
    )
    GROUP BY ss.session_id
  )
  SELECT
    gs.id as session_id,
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
    gs.completed_at,
    sp.participants_data as participants,
    sp.winner_user_id as winner_id,
    sp.winner_display_name as winner_name
  FROM game_sessions gs
  INNER JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_participants sp ON sp.session_id = gs.id
  WHERE gs.house_id = house_id_param
    AND gs.status = 'completed'
  ORDER BY gs.completed_at DESC;
END;
$$;

COMMENT ON FUNCTION get_house_game_history IS 'Returns complete game history for a house with all participant data and scoring configuration';