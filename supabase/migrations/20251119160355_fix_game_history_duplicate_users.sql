/*
  # Fix Game History Duplicate Users

  ## Problem
  The get_house_game_history function was returning duplicate user entries
  when aggregating session scores.

  ## Solution
  Drop and recreate function to ensure each user appears only once per session
  by using a subquery with DISTINCT ON.

  ## Changes
  - Drop existing get_house_game_history function
  - Recreate with proper deduplication logic
*/

DROP FUNCTION IF EXISTS get_house_game_history(uuid);

CREATE OR REPLACE FUNCTION get_house_game_history(house_id_param uuid)
RETURNS TABLE (
  session_id uuid,
  game_id uuid,
  game_name text,
  game_emoji text,
  game_type text,
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
  -- Verify user is a member of this house
  IF NOT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = house_id_param
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this house';
  END IF;

  RETURN QUERY
  WITH distinct_scores AS (
    SELECT DISTINCT ON (ss.session_id, ss.user_id)
      ss.session_id,
      ss.user_id,
      ss.score,
      ss.placement,
      ss.is_winner
    FROM session_scores ss
    WHERE ss.session_id IN (
      SELECT gs.id
      FROM game_sessions gs
      WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
    )
    ORDER BY ss.session_id, ss.user_id, ss.created_at DESC
  ),
  session_participants AS (
    SELECT
      ds.session_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', ds.user_id,
          'nickname', hm.nickname,
          'username', p.username,
          'score', ds.score,
          'placement', ds.placement,
          'is_winner', ds.is_winner,
          'profile_photo_url', ups.profile_photo_url,
          'equipped_kit_colors', hk.color_scheme
        ) ORDER BY ds.placement ASC NULLS LAST, ds.score DESC
      ) as participants_data,
      MAX(CASE WHEN ds.is_winner THEN ds.user_id END) as winner_user_id,
      MAX(CASE WHEN ds.is_winner THEN hm.nickname END) as winner_display_name
    FROM distinct_scores ds
    LEFT JOIN house_members hm ON hm.user_id = ds.user_id AND hm.house_id = house_id_param
    LEFT JOIN profiles p ON p.id = ds.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ds.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    GROUP BY ds.session_id
  )
  SELECT
    gs.id as session_id,
    g.id as game_id,
    g.name as game_name,
    g.game_emoji,
    g.game_type,
    gs.completed_at,
    sp.participants_data as participants,
    sp.winner_user_id as winner_id,
    sp.winner_display_name as winner_name
  FROM game_sessions gs
  INNER JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_participants sp ON sp.session_id = gs.id
  WHERE gs.house_id = house_id_param
    AND gs.status = 'completed'
  ORDER BY gs.completed_at DESC;
END;
$$;

COMMENT ON FUNCTION get_house_game_history IS 'Returns complete game history for a house with all participant data (deduplicated)';
