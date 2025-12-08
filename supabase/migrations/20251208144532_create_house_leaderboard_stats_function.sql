/*
  # Create House Leaderboard Stats Function
  
  1. Purpose
    - Provides house-specific leaderboard data with multiple stat filters
    - Calculates Most Wins, Best Accuracy, and Winning Streaks per house
  
  2. Returns
    - Player rankings based on selected filter
    - Player names, avatars, kit colors, and relevant stats
  
  3. Filters
    - most_wins: Count of first-place finishes in this house
    - best_accuracy: Average accuracy for accuracy-based games
    - winning_streak: Longest consecutive wins in this house
*/

-- Function to get house-specific leaderboard
CREATE OR REPLACE FUNCTION get_house_leaderboard_stats(
  house_id_param UUID,
  stat_type TEXT DEFAULT 'most_wins',
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  profile_photo_url TEXT,
  equipped_kit_colors JSONB,
  stat_value NUMERIC,
  total_games INT,
  additional_info JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Most Wins: Count first-place finishes
  IF stat_type = 'most_wins' THEN
    RETURN QUERY
    SELECT 
      ss.user_id,
      p.username,
      ups.profile_photo_url,
      hk.color_scheme as equipped_kit_colors,
      COUNT(CASE WHEN ss.placement = 1 THEN 1 END)::NUMERIC as stat_value,
      COUNT(DISTINCT ss.session_id)::INT as total_games,
      jsonb_build_object(
        'wins', COUNT(CASE WHEN ss.placement = 1 THEN 1 END),
        'second_place', COUNT(CASE WHEN ss.placement = 2 THEN 1 END),
        'third_place', COUNT(CASE WHEN ss.placement = 3 THEN 1 END)
      ) as additional_info
    FROM session_scores ss
    INNER JOIN game_sessions gs ON ss.session_id = gs.id
    INNER JOIN profiles p ON ss.user_id = p.id
    LEFT JOIN user_profile_settings ups ON ss.user_id = ups.user_id
    LEFT JOIN house_kits hk ON ups.equipped_house_kit_id = hk.id
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
      AND gs.is_solo_game = false
    GROUP BY ss.user_id, p.username, ups.profile_photo_url, hk.color_scheme
    HAVING COUNT(CASE WHEN ss.placement = 1 THEN 1 END) > 0
    ORDER BY stat_value DESC, total_games DESC
    LIMIT limit_count;
  
  -- Best Accuracy: Average accuracy percentage for accuracy-based games
  ELSIF stat_type = 'best_accuracy' THEN
    RETURN QUERY
    SELECT 
      ss.user_id,
      p.username,
      ups.profile_photo_url,
      hk.color_scheme as equipped_kit_colors,
      AVG(
        CASE 
          WHEN ss.accuracy_attempts > 0 
          THEN (ss.accuracy_hits::NUMERIC / ss.accuracy_attempts::NUMERIC * 100)
          ELSE 0 
        END
      )::NUMERIC as stat_value,
      COUNT(DISTINCT ss.session_id)::INT as total_games,
      jsonb_build_object(
        'total_hits', SUM(ss.accuracy_hits),
        'total_attempts', SUM(ss.accuracy_attempts),
        'games_with_accuracy', COUNT(DISTINCT CASE WHEN ss.accuracy_attempts > 0 THEN ss.session_id END)
      ) as additional_info
    FROM session_scores ss
    INNER JOIN game_sessions gs ON ss.session_id = gs.id
    INNER JOIN games g ON gs.game_id = g.id
    INNER JOIN profiles p ON ss.user_id = p.id
    LEFT JOIN user_profile_settings ups ON ss.user_id = ups.user_id
    LEFT JOIN house_kits hk ON ups.equipped_house_kit_id = hk.id
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
      AND g.scoring_type = 'accuracy'
      AND ss.accuracy_attempts > 0
      AND gs.is_solo_game = false
    GROUP BY ss.user_id, p.username, ups.profile_photo_url, hk.color_scheme
    HAVING COUNT(DISTINCT ss.session_id) >= 3  -- Require at least 3 games
    ORDER BY stat_value DESC
    LIMIT limit_count;
  
  -- Winning Streak: Calculate longest consecutive wins
  ELSIF stat_type = 'winning_streak' THEN
    RETURN QUERY
    WITH game_sequence AS (
      SELECT 
        ss.user_id,
        p.username,
        ups.profile_photo_url,
        hk.color_scheme as equipped_kit_colors,
        gs.completed_at,
        ss.placement,
        ROW_NUMBER() OVER (PARTITION BY ss.user_id ORDER BY gs.completed_at) -
        ROW_NUMBER() OVER (PARTITION BY ss.user_id, CASE WHEN ss.placement = 1 THEN 1 ELSE 0 END ORDER BY gs.completed_at) as streak_group
      FROM session_scores ss
      INNER JOIN game_sessions gs ON ss.session_id = gs.id
      INNER JOIN profiles p ON ss.user_id = p.id
      LEFT JOIN user_profile_settings ups ON ss.user_id = ups.user_id
      LEFT JOIN house_kits hk ON ups.equipped_house_kit_id = hk.id
      WHERE gs.house_id = house_id_param
        AND gs.status = 'completed'
        AND gs.is_solo_game = false
    ),
    max_streaks AS (
      SELECT 
        user_id,
        username,
        profile_photo_url,
        equipped_kit_colors,
        MAX(CASE WHEN placement = 1 THEN consecutive_wins ELSE 0 END) as longest_streak,
        COUNT(DISTINCT CASE WHEN placement = 1 THEN completed_at END) as total_wins,
        COUNT(*) as total_games
      FROM (
        SELECT 
          user_id,
          username,
          profile_photo_url,
          equipped_kit_colors,
          placement,
          completed_at,
          COUNT(*) OVER (PARTITION BY user_id, streak_group) as consecutive_wins
        FROM game_sequence
        WHERE placement = 1
      ) streaks
      GROUP BY user_id, username, profile_photo_url, equipped_kit_colors
    )
    SELECT 
      ms.user_id,
      ms.username,
      ms.profile_photo_url,
      ms.equipped_kit_colors,
      ms.longest_streak::NUMERIC as stat_value,
      ms.total_games::INT,
      jsonb_build_object(
        'longest_streak', ms.longest_streak,
        'total_wins', ms.total_wins,
        'current_streak', 0  -- TODO: Calculate current active streak if needed
      ) as additional_info
    FROM max_streaks ms
    WHERE ms.longest_streak >= 2  -- Only show players with at least 2 consecutive wins
    ORDER BY ms.longest_streak DESC, ms.total_wins DESC
    LIMIT limit_count;
  
  -- Default to most wins if unknown stat type
  ELSE
    RAISE EXCEPTION 'Invalid stat_type. Use: most_wins, best_accuracy, or winning_streak';
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_house_leaderboard_stats TO authenticated;