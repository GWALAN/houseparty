/*
  # Fix Premature Game Logging in History
  
  ## Problem
  Games are showing up in game history immediately after creation with status 'pending',
  even before any gameplay happens. This shows "0.00" scores and "Waiting" status in
  the game history and leaderboard.
  
  ## Root Cause
  The get_house_game_history function currently filters for status = 'completed',
  but session_scores may be getting created for pending sessions prematurely.
  
  ## Solution
  1. Ensure get_house_game_history only returns truly completed sessions
  2. Add stricter filtering to exclude:
     - Sessions with status 'pending' 
     - Sessions without completed_at timestamp
     - Sessions without any valid scores
  
  ## Changes
  - Update get_house_game_history to only return fully completed games
  - Ensure completed_at is NOT NULL
  - Ensure at least one participant has a valid score
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
  WITH completed_sessions AS (
    -- Only get sessions that are truly completed
    SELECT gs.id, gs.house_id, gs.game_id, gs.completed_at
    FROM game_sessions gs
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
      AND gs.completed_at IS NOT NULL
      -- Ensure there's at least one score entry for this session
      AND EXISTS (
        SELECT 1 FROM session_scores ss
        WHERE ss.session_id = gs.id
      )
  ),
  distinct_scores AS (
    SELECT DISTINCT ON (ss.session_id, ss.user_id)
      ss.session_id,
      ss.user_id,
      ss.score,
      ss.placement,
      ss.is_winner
    FROM session_scores ss
    INNER JOIN completed_sessions cs ON cs.id = ss.session_id
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
  FROM completed_sessions gs
  INNER JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_participants sp ON sp.session_id = gs.id
  LEFT JOIN session_winners sw ON sw.session_id = gs.id
  ORDER BY gs.completed_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_house_game_history(uuid) TO authenticated;

COMMENT ON FUNCTION get_house_game_history IS 'Returns completed game history for a house. Only shows games with status=completed, completed_at timestamp, and valid scores.';
