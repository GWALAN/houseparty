/*
  # Create Optimized Leaderboard Function

  1. New Function
    - `get_house_leaderboard(house_id_param uuid)`
    - Returns complete leaderboard data in single query
    - Includes all player stats, profile info, kit colors
    - Dramatically improves performance (100+ queries → 1 query)

  2. Performance Benefits
    - Eliminates N+1 query problem
    - Server-side aggregation
    - Reduced network overhead
    - Faster response times
*/

CREATE OR REPLACE FUNCTION get_house_leaderboard(house_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  username text,
  profile_photo_url text,
  equipped_kit_colors jsonb,
  wins bigint,
  games_played bigint,
  win_rate numeric,
  total_score numeric,
  current_win_streak integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH house_sessions AS (
    SELECT gs.id as session_id
    FROM game_sessions gs
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
      AND gs.is_solo_game = false
  ),
  member_stats AS (
    SELECT 
      hm.user_id,
      hm.nickname,
      p.username,
      ups.profile_photo_url,
      hk.color_scheme as equipped_kit_colors,
      COALESCE(COUNT(DISTINCT ss.session_id), 0) as games_played,
      COALESCE(SUM(CASE WHEN ss.is_winner THEN 1 ELSE 0 END), 0) as wins,
      COALESCE(SUM(ss.score), 0) as total_score,
      COALESCE(ps.current_streak, 0) as current_win_streak
    FROM house_members hm
    INNER JOIN profiles p ON p.id = hm.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = hm.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    LEFT JOIN session_scores ss ON ss.user_id = hm.user_id 
      AND ss.session_id IN (SELECT session_id FROM house_sessions)
    LEFT JOIN player_streaks ps ON ps.user_id = hm.user_id 
      AND ps.house_id = house_id_param 
      AND ps.streak_type = 'win'
    WHERE hm.house_id = house_id_param
    GROUP BY 
      hm.user_id, 
      hm.nickname, 
      p.username, 
      ups.profile_photo_url, 
      hk.color_scheme,
      ps.current_streak
  )
  SELECT 
    ms.user_id,
    ms.nickname,
    ms.username,
    ms.profile_photo_url,
    ms.equipped_kit_colors,
    ms.wins,
    ms.games_played,
    CASE 
      WHEN ms.games_played > 0 
      THEN ROUND((ms.wins::numeric / ms.games_played::numeric) * 100, 2)
      ELSE 0 
    END as win_rate,
    ms.total_score,
    ms.current_win_streak
  FROM member_stats ms
  ORDER BY ms.wins DESC, win_rate DESC, ms.games_played DESC;
END;
$$;