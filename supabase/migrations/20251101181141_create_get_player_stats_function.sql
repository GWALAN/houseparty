/*
  # Create get_player_stats function

  1. New Functions
    - `get_player_stats(player_id uuid)` - Returns player statistics including:
      - total_games: Total number of games played
      - total_wins: Total number of wins
      - win_rate: Win percentage
      - avg_score: Average score across all games
      - last_played: Last time the player played a game
      
  2. Security
    - Function is accessible to authenticated users
*/

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
    COUNT(*)::bigint AS total_games,
    COUNT(*) FILTER (WHERE ss.is_winner = true)::bigint AS total_wins,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE ss.is_winner = true)::numeric / COUNT(*)::numeric * 100)
      ELSE 0
    END AS win_rate,
    COALESCE(AVG(ss.score), 0)::numeric AS avg_score,
    MAX(gs.started_at) AS last_played
  FROM session_scores ss
  INNER JOIN game_sessions gs ON ss.session_id = gs.id
  WHERE ss.user_id = player_id
    AND gs.is_solo_game = false;
END;
$$;