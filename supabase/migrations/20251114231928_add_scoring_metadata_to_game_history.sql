/*
  # Add Scoring Metadata to Game History Participants

  ## Problem
  The get_house_game_history function returns participant data but doesn't include:
  - accuracy_hits
  - accuracy_attempts
  - ratio_numerator
  - ratio_denominator

  This causes the leaderboard to display "0.00 %" instead of proper accuracy formatting like "7/10 (70.0%)"

  ## Solution
  Add these fields to the jsonb_build_object in the session_participants CTE
*/

DROP FUNCTION IF EXISTS get_house_game_history(uuid);

CREATE FUNCTION get_house_game_history(house_id_param uuid)
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
  status text,
  completed_at timestamptz,
  last_updated_at timestamptz,
  participants jsonb,
  winner_id uuid,
  winner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
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
          'nickname', COALESCE(hm.nickname, ups.display_name, p.username, 'Unknown'),
          'username', p.username,
          'score', ss.score,
          'placement', ss.placement,
          'is_winner', ss.is_winner,
          'profile_photo_url', ups.profile_photo_url,
          'equipped_kit_colors', hk.color_scheme,
          'accuracy_hits', ss.accuracy_hits,
          'accuracy_attempts', ss.accuracy_attempts,
          'ratio_numerator', ss.ratio_numerator,
          'ratio_denominator', ss.ratio_denominator
        ) ORDER BY ss.placement ASC NULLS LAST, ss.score DESC
      ) as participants_data,
      (array_agg(ss.user_id) FILTER (WHERE ss.is_winner))[1] as winner_user_id,
      (array_agg(COALESCE(hm.nickname, ups.display_name, p.username, 'Unknown')) FILTER (WHERE ss.is_winner))[1] as winner_display_name
    FROM session_scores ss
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = house_id_param
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    WHERE ss.session_id IN (
      SELECT gs.id
      FROM game_sessions gs
      WHERE gs.house_id = house_id_param
      AND gs.status IN ('active', 'ongoing', 'completed')
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
    g.lower_is_better,
    g.distance_unit,
    g.weight_unit,
    g.max_attempts,
    gs.status::text,
    gs.completed_at,
    gs.last_updated_at,
    sp.participants_data as participants,
    sp.winner_user_id as winner_id,
    sp.winner_display_name as winner_name
  FROM game_sessions gs
  INNER JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_participants sp ON sp.session_id = gs.id
  WHERE gs.house_id = house_id_param
  AND gs.status IN ('active', 'ongoing', 'completed')
  ORDER BY
    CASE
      WHEN gs.status IN ('active', 'ongoing') THEN 0
      ELSE 1
    END,
    gs.last_updated_at DESC,
    gs.completed_at DESC;
END;
$$;

COMMENT ON FUNCTION get_house_game_history IS 'Returns complete game history with scoring metadata for proper score display';
