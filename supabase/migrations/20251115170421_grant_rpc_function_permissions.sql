/*
  # Grant Execute Permissions to RPC Functions

  ## Changes
  Ensure all critical RPC functions have proper execute permissions for authenticated users
*/

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_player_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_chance_based_kit_unlock(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_house_game_history(uuid) TO authenticated;

-- Also grant to anon for cases where they might need it (they still need to be authenticated via RLS)
GRANT EXECUTE ON FUNCTION get_player_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION check_chance_based_kit_unlock(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION get_house_game_history(uuid) TO anon;
