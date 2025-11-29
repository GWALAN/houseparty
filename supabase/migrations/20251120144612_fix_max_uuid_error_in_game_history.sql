/*
  # Fix MAX(uuid) Error in get_house_game_history Function

  ## Problem
  The current get_house_game_history function uses MAX() on UUID columns:
  - MAX(CASE WHEN ds.is_winner THEN ds.user_id END)
  
  PostgreSQL doesn't support MAX() aggregate on UUID types, causing:
  "function max(uuid) does not exist"

  ## Solution
  Replace the aggregation approach with DISTINCT ON to get the winner info,
  similar to how the optimized version was supposed to work.

  ## Changes
  - Remove MAX() calls on UUID columns
  - Use a separate CTE with DISTINCT ON for winners
  - Ensure the function returns proper winner information
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
          'nickname', COALESCE(hm.nickname, p.username, 'Player'),
          'username', p.username,
          'score', ds.score,
          'placement', ds.placement,
          'is_winner', ds.is_winner,
          'profile_photo_url', ups.profile_photo_url,
          'equipped_kit_colors', hk.color_scheme
        ) ORDER BY ds.placement ASC NULLS LAST, ds.score DESC
      ) as participants_data
    FROM distinct_scores ds
    LEFT JOIN house_members hm ON hm.user_id = ds.user_id AND hm.house_id = house_id_param
    LEFT JOIN profiles p ON p.id = ds.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = ds.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    GROUP BY ds.session_id
  ),
  session_winners AS (
    -- Get the winner for each session using DISTINCT ON
    SELECT DISTINCT ON (ds.session_id)
      ds.session_id,
      ds.user_id as winner_user_id,
      COALESCE(hm.nickname, p.username, 'Player') as winner_display_name
    FROM distinct_scores ds
    LEFT JOIN house_members hm ON hm.user_id = ds.user_id AND hm.house_id = house_id_param
    LEFT JOIN profiles p ON p.id = ds.user_id
    WHERE ds.is_winner = true
    ORDER BY ds.session_id, ds.placement ASC NULLS LAST
  )
  SELECT
    gs.id as session_id,
    g.id as game_id,
    g.name as game_name,
    g.game_emoji,
    g.game_type,
    gs.completed_at,
    COALESCE(sp.participants_data, '[]'::jsonb) as participants,
    sw.winner_user_id as winner_id,
    sw.winner_display_name as winner_name
  FROM game_sessions gs
  INNER JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_participants sp ON sp.session_id = gs.id
  LEFT JOIN session_winners sw ON sw.session_id = gs.id
  WHERE gs.house_id = house_id_param
    AND gs.status = 'completed'
  ORDER BY gs.completed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_house_game_history(uuid) TO authenticated;

COMMENT ON FUNCTION get_house_game_history IS 'Returns complete game history for a house with all participant data (no MAX on UUIDs)';
