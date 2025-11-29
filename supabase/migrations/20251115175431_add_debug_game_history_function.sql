/*
  # Add Debug Function for Game History

  Creates a simple debug function that returns raw game session data
  without RLS checks to help diagnose why the leaderboard isn't showing games.
*/

CREATE OR REPLACE FUNCTION debug_game_history(house_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'house_id', house_id_param,
    'is_member', EXISTS(
      SELECT 1 FROM house_members 
      WHERE house_id = house_id_param 
      AND user_id = auth.uid()
    ),
    'current_user_id', auth.uid(),
    'completed_sessions', (
      SELECT COUNT(*) 
      FROM game_sessions 
      WHERE house_id = house_id_param 
      AND status = 'completed'
    ),
    'all_sessions', (
      SELECT COUNT(*) 
      FROM game_sessions 
      WHERE house_id = house_id_param
    ),
    'sample_session', (
      SELECT jsonb_build_object(
        'id', gs.id,
        'status', gs.status,
        'completed_at', gs.completed_at,
        'score_count', (SELECT COUNT(*) FROM session_scores WHERE session_id = gs.id)
      )
      FROM game_sessions gs
      WHERE gs.house_id = house_id_param
      ORDER BY gs.created_at DESC
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$;