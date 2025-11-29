/*
  # Fix RPC Functions and Solo Game Handling

  ## Problem
  1. get_player_stats filters by `is_solo_game = false` which excludes sessions where is_solo_game is NULL
  2. Game sessions created don't set the is_solo_game flag
  3. This causes 404/null errors when fetching player stats

  ## Solution
  1. Update get_player_stats to handle NULL is_solo_game values (treat NULL as false)
  2. Set default value for is_solo_game to false
  3. Update existing NULL values to false
*/

-- Update existing NULL values to false
UPDATE game_sessions 
SET is_solo_game = false 
WHERE is_solo_game IS NULL;

-- Set default value for future records
ALTER TABLE game_sessions 
ALTER COLUMN is_solo_game SET DEFAULT false;

-- Recreate get_player_stats function to handle NULLs properly
CREATE OR REPLACE FUNCTION get_player_stats(player_id uuid)
RETURNS TABLE (
  total_games bigint,
  total_wins bigint,
  win_rate numeric,
  avg_score numeric,
  last_played timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT ss.session_id)::bigint AS total_games,
    COUNT(DISTINCT CASE WHEN ss.is_winner = true THEN ss.session_id ELSE NULL END)::bigint AS total_wins,
    CASE 
      WHEN COUNT(DISTINCT ss.session_id) > 0 THEN 
        (COUNT(DISTINCT CASE WHEN ss.is_winner = true THEN ss.session_id ELSE NULL END)::numeric / 
         COUNT(DISTINCT ss.session_id)::numeric * 100)
      ELSE 0
    END AS win_rate,
    COALESCE(AVG(ss.score), 0)::numeric AS avg_score,
    MAX(gs.completed_at) AS last_played
  FROM session_scores ss
  INNER JOIN game_sessions gs ON ss.session_id = gs.id
  WHERE ss.user_id = player_id
    AND COALESCE(gs.is_solo_game, false) = false
    AND gs.status = 'completed';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_player_stats(uuid) TO authenticated;

COMMENT ON FUNCTION get_player_stats IS 'Returns player statistics excluding solo games. Treats NULL is_solo_game as false.';
