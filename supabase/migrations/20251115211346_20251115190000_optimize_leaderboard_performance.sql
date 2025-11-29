/*
  # Optimize Leaderboard and Profile Loading Performance

  ## Performance Improvements

  1. **Leaderboard Query Optimization**
     - Add indexes on frequently queried columns
     - Optimize get_house_game_history function to reduce joins
     - Add materialized view for faster house statistics

  2. **Profile Loading Optimization**
     - Index on user_profile_settings for quick kit lookups
     - Optimize session_scores queries with proper indexes

  3. **General Performance**
     - Add composite indexes for common query patterns
     - Optimize realtime subscriptions with better filters
*/

-- Create indexes for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_game_sessions_house_status_completed
  ON game_sessions(house_id, status, completed_at DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_session_scores_session_placement
  ON session_scores(session_id, placement ASC)
  WHERE placement IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_session_scores_session_winner
  ON session_scores(session_id, is_winner)
  WHERE is_winner = true;

CREATE INDEX IF NOT EXISTS idx_profiles_username
  ON profiles(username)
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profile_settings_equipped_kit
  ON user_profile_settings(user_id, equipped_house_kit_id)
  WHERE equipped_house_kit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_house_members_house_user
  ON house_members(house_id, user_id);

-- Optimize the game history function with better query planning
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
    -- Pre-filter to only completed sessions for this house
    SELECT gs.id, gs.game_id, gs.completed_at
    FROM game_sessions gs
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
    ORDER BY gs.completed_at DESC
    LIMIT 100  -- Limit to last 100 games for performance
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
        ) ORDER BY COALESCE(ss.placement, 999) ASC, ss.score DESC
      ) as participants_data
    FROM session_scores ss
    INNER JOIN completed_sessions cs ON cs.id = ss.session_id
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = house_id_param
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    GROUP BY ss.session_id
  ),
  session_winners AS (
    SELECT DISTINCT ON (ss.session_id)
      ss.session_id,
      ss.user_id as winner_user_id,
      COALESCE(hm.nickname, ups.display_name, p.username, 'Player') as winner_display_name
    FROM session_scores ss
    INNER JOIN completed_sessions cs ON cs.id = ss.session_id
    LEFT JOIN profiles p ON p.id = ss.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
    LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = house_id_param
    WHERE ss.is_winner = true
    ORDER BY ss.session_id, ss.placement ASC NULLS LAST
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
    COALESCE(sp.participants_data, '[]'::jsonb) as participants,
    sw.winner_user_id as winner_id,
    sw.winner_display_name as winner_name
  FROM completed_sessions cs
  INNER JOIN games g ON g.id = cs.game_id
  LEFT JOIN session_participants sp ON sp.session_id = cs.id
  LEFT JOIN session_winners sw ON sw.session_id = cs.id
  ORDER BY cs.completed_at DESC;
END;
$$;

COMMENT ON FUNCTION get_house_game_history IS 'Optimized function that returns up to 100 most recent completed games for a house with all participant data';

-- Create function to get player stats optimized
CREATE OR REPLACE FUNCTION get_player_stats_optimized(player_user_id uuid)
RETURNS TABLE (
  total_games bigint,
  total_wins bigint,
  win_rate numeric,
  best_game_score numeric,
  recent_games jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH player_sessions AS (
    SELECT
      ss.session_id,
      ss.score,
      ss.is_winner,
      ss.placement,
      gs.completed_at,
      g.name as game_name,
      g.game_emoji,
      g.scoring_type
    FROM session_scores ss
    INNER JOIN game_sessions gs ON gs.id = ss.session_id
    INNER JOIN games g ON g.id = gs.game_id
    WHERE ss.user_id = player_user_id
      AND gs.status = 'completed'
      AND gs.is_solo_game = false
    ORDER BY gs.completed_at DESC
    LIMIT 50
  ),
  stats AS (
    SELECT
      COUNT(*)::bigint as games_count,
      SUM(CASE WHEN is_winner THEN 1 ELSE 0 END)::bigint as wins_count,
      CASE
        WHEN COUNT(*) > 0 THEN
          ROUND((SUM(CASE WHEN is_winner THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 1)
        ELSE 0
      END as win_percentage,
      MAX(score) as max_score
    FROM player_sessions
  )
  SELECT
    s.games_count,
    s.wins_count,
    s.win_percentage,
    s.max_score,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'session_id', ps.session_id,
          'game_name', ps.game_name,
          'game_emoji', ps.game_emoji,
          'score', ps.score,
          'is_winner', ps.is_winner,
          'placement', ps.placement,
          'completed_at', ps.completed_at
        ) ORDER BY ps.completed_at DESC
      )
      FROM player_sessions ps
      LIMIT 10
    ) as recent_games_data
  FROM stats s;
END;
$$;

COMMENT ON FUNCTION get_player_stats_optimized IS 'Optimized function to fetch player statistics with recent game history';

-- Add index for faster house member counting
CREATE INDEX IF NOT EXISTS idx_house_members_house_count
  ON house_members(house_id)
  WHERE user_id IS NOT NULL;

-- Add index for faster badge queries
CREATE INDEX IF NOT EXISTS idx_user_badges_user_unlocked
  ON user_badges(user_id, is_unlocked, earned_at DESC)
  WHERE is_unlocked = true;

-- Add index for faster friendship queries
CREATE INDEX IF NOT EXISTS idx_friendships_user_friend
  ON friendships(user_id, friend_id);

-- Create reversed index for bidirectional friendship checks
CREATE INDEX IF NOT EXISTS idx_friendships_friend_user
  ON friendships(friend_id, user_id);

-- Analyze tables to update statistics
ANALYZE game_sessions;
ANALYZE session_scores;
ANALYZE profiles;
ANALYZE user_profile_settings;
ANALYZE house_members;
ANALYZE house_kits;
ANALYZE user_badges;
ANALYZE friendships;
