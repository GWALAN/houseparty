/*
  # Fix get_house_game_history - UUID Aggregation

  ## Summary
  Fixed the MAX() function error on UUID columns by using proper aggregation methods.

  ## Changes
  - Replace MAX(uuid) with proper BOOL_OR filtering to get winner data
  - Ensures function works correctly for leaderboard display
*/

DROP FUNCTION IF EXISTS get_house_game_history(UUID);

CREATE OR REPLACE FUNCTION get_house_game_history(house_id_param UUID)
RETURNS TABLE (
  session_id UUID,
  game_id UUID,
  game_name TEXT,
  game_emoji TEXT,
  game_type TEXT,
  scoring_type TEXT,
  scoring_unit TEXT,
  lower_is_better BOOLEAN,
  distance_unit TEXT,
  weight_unit TEXT,
  max_attempts INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT,
  participants JSONB,
  winner_id UUID,
  winner_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH session_players AS (
    SELECT 
      gs.id as session_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', ss.user_id,
          'username', COALESCE(p.username, 'Unknown'),
          'nickname', COALESCE(hm.nickname, ups.display_name, p.username, 'Unknown'),
          'score', COALESCE(ss.score, 0),
          'placement', ss.placement,
          'is_winner', COALESCE(ss.is_winner, false),
          'profile_photo_url', ups.profile_photo_url,
          'equipped_kit_colors', hk.color_scheme,
          'accuracy_hits', ss.accuracy_hits,
          'accuracy_attempts', ss.accuracy_attempts,
          'ratio_numerator', ss.ratio_numerator,
          'ratio_denominator', ss.ratio_denominator
        ) ORDER BY 
          CASE WHEN ss.placement IS NOT NULL THEN ss.placement ELSE 999 END,
          ss.score DESC
      ) FILTER (WHERE ss.user_id IS NOT NULL) as players_data,
      (array_agg(ss.user_id ORDER BY ss.is_winner DESC NULLS LAST) FILTER (WHERE ss.is_winner = true))[1] as winner_user_id,
      (array_agg(COALESCE(hm.nickname, ups.display_name, p.username, 'Unknown') ORDER BY ss.is_winner DESC NULLS LAST) FILTER (WHERE ss.is_winner = true))[1] as winner_username
    FROM game_sessions gs
    LEFT JOIN session_scores ss ON ss.session_id = gs.id
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = gs.house_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
    GROUP BY gs.id
  )
  SELECT 
    gs.id as session_id,
    g.id as game_id,
    g.name as game_name,
    COALESCE(g.emoji, '🎮') as game_emoji,
    g.game_type,
    g.scoring_type,
    g.scoring_unit,
    g.lower_is_better,
    g.distance_unit,
    g.weight_unit,
    g.max_attempts,
    gs.started_at,
    gs.completed_at,
    gs.status,
    COALESCE(sp.players_data, '[]'::jsonb) as participants,
    sp.winner_user_id as winner_id,
    sp.winner_username as winner_name
  FROM game_sessions gs
  JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_players sp ON sp.session_id = gs.id
  WHERE gs.house_id = house_id_param
    AND gs.status = 'completed'
  ORDER BY gs.completed_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_house_game_history(UUID) TO authenticated;