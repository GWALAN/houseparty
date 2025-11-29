/*
  # Fix Game Sessions and Function Issues

  ## Summary
  Fixes two critical issues preventing game invitations:
  1. Adds 'pending' status to game_sessions status constraint
  2. Fixes get_house_game_history function parameter name

  ## Changes
  1. Drop and recreate game_sessions_status_check constraint with 'pending' status
  2. Drop and recreate get_house_game_history function with correct parameter name

  ## Security
  - Maintains existing RLS policies
  - No changes to access controls
*/

-- Fix game_sessions status constraint to include 'pending'
ALTER TABLE game_sessions 
DROP CONSTRAINT IF EXISTS game_sessions_status_check;

ALTER TABLE game_sessions 
ADD CONSTRAINT game_sessions_status_check 
CHECK (status IN ('pending', 'active', 'completed', 'cancelled'));

-- Fix get_house_game_history function parameter name
DROP FUNCTION IF EXISTS get_house_game_history(uuid);
DROP FUNCTION IF EXISTS get_house_game_history(house_id_param uuid);

CREATE OR REPLACE FUNCTION get_house_game_history(p_house_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  game_type text,
  created_at timestamptz,
  completed_at timestamptz,
  status text,
  scoring_type text,
  scoring_unit text,
  scoring_category text,
  lower_is_better boolean,
  distance_unit text,
  weight_unit text,
  max_attempts integer,
  game_emoji text,
  players jsonb
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.name,
    g.game_type,
    g.created_at,
    gs.completed_at,
    gs.status,
    g.scoring_type,
    g.scoring_unit,
    g.scoring_category,
    g.lower_is_better,
    g.distance_unit,
    g.weight_unit,
    g.max_attempts,
    COALESCE(g.game_emoji, g.emoji, '🎮') as game_emoji,
    (
      SELECT jsonb_agg(
        DISTINCT jsonb_build_object(
          'user_id', ss.user_id,
          'nickname', COALESCE(ups.display_name, p.username, 'Player'),
          'avatar_url', p.avatar_url,
          'score', ss.score,
          'placement', ss.placement,
          'is_winner', ss.is_winner
        )
      )
      FROM session_scores ss
      LEFT JOIN profiles p ON p.id = ss.user_id
      LEFT JOIN user_profile_settings ups ON ups.user_id = ss.user_id
      WHERE ss.session_id = gs.id
    ) as players
  FROM games g
  INNER JOIN game_sessions gs ON gs.game_id = g.id
  WHERE g.house_id = p_house_id
    AND g.deleted_at IS NULL
    AND gs.status = 'completed'
    AND gs.completed_at IS NOT NULL
  ORDER BY gs.completed_at DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION get_house_game_history(uuid) TO authenticated;

COMMENT ON FUNCTION get_house_game_history IS 'Returns completed game history for a house with player details';