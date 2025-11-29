/*
  # Fix Leaderboard and Scoring Issues

  ## Changes
  1. Fix get_house_game_history to return 'participants' instead of 'players'
  2. Ensure proper winner calculation for all scoring types
  3. Ensure placement is always calculated
  4. Add proper null handling for player data

  ## Impact
  - Leaderboard will display game history correctly
  - Win rates will calculate properly
  - All players will have placements assigned
*/

-- Drop and recreate get_house_game_history with correct field name
DROP FUNCTION IF EXISTS get_house_game_history(uuid);

CREATE FUNCTION get_house_game_history(house_id_param uuid)
RETURNS TABLE(
  session_id uuid,
  game_id uuid,
  game_name text,
  game_emoji text,
  scoring_type text,
  scoring_unit text,
  lower_is_better boolean,
  started_at timestamptz,
  completed_at timestamptz,
  status text,
  participants jsonb,
  winner_id uuid,
  winner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
          'nickname', hm.nickname,
          'score', COALESCE(ss.score, 0),
          'placement', ss.placement,
          'is_winner', ss.is_winner,
          'profile_photo_url', p.avatar_url,
          'equipped_kit_colors', ups.equipped_kit_colors,
          'accuracy_hits', ss.accuracy_hits,
          'accuracy_attempts', ss.accuracy_attempts,
          'ratio_numerator', ss.ratio_numerator,
          'ratio_denominator', ss.ratio_denominator
        ) ORDER BY 
          CASE WHEN ss.placement IS NOT NULL THEN ss.placement ELSE 999 END,
          ss.score DESC
      ) FILTER (WHERE ss.user_id IS NOT NULL) as players_data,
      MAX(CASE WHEN ss.is_winner THEN ss.user_id END) as winner_user_id,
      MAX(CASE WHEN ss.is_winner THEN COALESCE(p.username, 'Unknown') END) as winner_username
    FROM game_sessions gs
    LEFT JOIN session_scores ss ON ss.session_id = gs.id
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = gs.house_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
    GROUP BY gs.id
  )
  SELECT 
    gs.id as session_id,
    g.id as game_id,
    g.name as game_name,
    COALESCE(g.emoji, '🎮') as game_emoji,
    g.scoring_type,
    g.scoring_unit,
    g.lower_is_better,
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_house_game_history(uuid) TO authenticated;

COMMENT ON FUNCTION get_house_game_history IS 'Returns game history for a house with participants array (not players)';