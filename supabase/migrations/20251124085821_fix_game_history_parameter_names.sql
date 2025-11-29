/*
  # Fix Game History Function Parameter Names

  1. Changes
    - Update get_house_game_history to accept house_id_param (matches app code)
    - Update get_house_leaderboard to accept house_id_param (matches app code)
    - These functions were defined with p_house_id but app calls with house_id_param
  
  2. Impact
    - Fixes 404 "function not found" errors in leaderboard screen
    - Allows game history to load properly
*/

-- Drop and recreate get_house_game_history with correct parameter name
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
  players jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', ss.user_id,
          'username', p.username,
          'score', ss.score,
          'placement', ss.placement,
          'is_winner', ss.is_winner
        )
      ) FILTER (WHERE ss.user_id IS NOT NULL),
      '[]'::jsonb
    ) as players
  FROM game_sessions gs
  JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_scores ss ON ss.session_id = gs.id
  LEFT JOIN profiles p ON p.id = ss.user_id
  WHERE gs.house_id = house_id_param
    AND gs.status = 'completed'
  GROUP BY gs.id, g.id, g.name, g.emoji, g.scoring_type, g.scoring_unit, 
           g.lower_is_better, gs.started_at, gs.completed_at, gs.status
  ORDER BY gs.completed_at DESC NULLS LAST;
END;
$$;

-- Drop and recreate get_house_leaderboard with correct parameter name
DROP FUNCTION IF EXISTS get_house_leaderboard(uuid);

CREATE FUNCTION get_house_leaderboard(house_id_param uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  total_games integer,
  total_wins integer,
  total_score numeric,
  win_rate numeric,
  current_streak integer,
  best_streak integer,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH player_stats AS (
    SELECT 
      p.id as user_id,
      p.username,
      p.avatar_url,
      COUNT(DISTINCT gs.id) as total_games,
      COUNT(DISTINCT CASE WHEN ss.is_winner THEN gs.id END) as total_wins,
      SUM(ss.score) as total_score,
      COALESCE(ps.current_streak, 0) as current_streak,
      COALESCE(ps.best_streak, 0) as best_streak
    FROM profiles p
    JOIN house_members hm ON hm.user_id = p.id
    LEFT JOIN session_scores ss ON ss.user_id = p.id
    LEFT JOIN game_sessions gs ON gs.id = ss.session_id AND gs.house_id = house_id_param AND gs.status = 'completed'
    LEFT JOIN player_streaks ps ON ps.user_id = p.id AND ps.house_id = house_id_param
    WHERE hm.house_id = house_id_param
    GROUP BY p.id, p.username, p.avatar_url, ps.current_streak, ps.best_streak
  )
  SELECT 
    ps.user_id,
    ps.username,
    ps.avatar_url,
    ps.total_games::integer,
    ps.total_wins::integer,
    COALESCE(ps.total_score, 0) as total_score,
    CASE 
      WHEN ps.total_games > 0 THEN ROUND((ps.total_wins::numeric / ps.total_games::numeric) * 100, 1)
      ELSE 0
    END as win_rate,
    ps.current_streak::integer,
    ps.best_streak::integer,
    ROW_NUMBER() OVER (ORDER BY ps.total_wins DESC, ps.total_score DESC)::integer as rank
  FROM player_stats ps
  ORDER BY rank;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_house_game_history(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_house_leaderboard(uuid) TO authenticated;