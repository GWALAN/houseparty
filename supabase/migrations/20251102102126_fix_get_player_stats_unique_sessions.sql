/*
  # Fix get_player_stats Function to Count Unique Sessions

  1. Changes
    - Update get_player_stats function to count unique game sessions instead of score entries
    - Prevent double-counting when players have multiple score entries per session
    - Ensure accurate win counting based on unique sessions won

  2. Performance
    - Use COUNT(DISTINCT session_id) for accurate session counting
    - Maintains same security and access patterns
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
    COUNT(DISTINCT ss.session_id)::bigint AS total_games,
    COUNT(DISTINCT CASE WHEN ss.is_winner = true THEN ss.session_id ELSE NULL END)::bigint AS total_wins,
    CASE 
      WHEN COUNT(DISTINCT ss.session_id) > 0 THEN 
        (COUNT(DISTINCT CASE WHEN ss.is_winner = true THEN ss.session_id ELSE NULL END)::numeric / 
         COUNT(DISTINCT ss.session_id)::numeric * 100)
      ELSE 0
    END AS win_rate,
    COALESCE(AVG(ss.score), 0)::numeric AS avg_score,
    MAX(gs.started_at) AS last_played
  FROM session_scores ss
  INNER JOIN game_sessions gs ON ss.session_id = gs.id
  WHERE ss.user_id = player_id
    AND gs.is_solo_game = false
    AND gs.status = 'completed';
END;
$$;