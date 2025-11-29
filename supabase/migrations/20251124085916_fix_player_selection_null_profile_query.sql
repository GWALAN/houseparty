/*
  # Fix Player Selection Query Issues

  1. Changes
    - Add better null handling in profile queries
    - Optimize house_members joins for game invitations
    - Add index for faster player lookups
    - Prevent null user_id queries that cause errors
  
  2. Impact
    - Fixes "id=eq.null" query errors
    - Prevents infinite loading on player selection screen
    - Improves performance when loading house members
*/

-- Add composite index for faster house member + profile lookups
CREATE INDEX IF NOT EXISTS idx_house_members_house_user 
ON house_members(house_id, user_id) 
WHERE user_id IS NOT NULL;

-- Add index on profiles for username searches
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON profiles(LOWER(username));

-- Create optimized function to get house members with profiles
CREATE OR REPLACE FUNCTION get_house_members_with_profiles(house_id_param uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  nickname text,
  role text,
  joined_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.username,
    p.avatar_url,
    hm.nickname,
    hm.role,
    hm.joined_at
  FROM house_members hm
  JOIN profiles p ON p.id = hm.user_id
  WHERE hm.house_id = house_id_param
    AND hm.user_id IS NOT NULL
    AND p.id IS NOT NULL
  ORDER BY hm.joined_at ASC;
END;
$$;

-- Create function to get available players for game invitations
CREATE OR REPLACE FUNCTION get_available_players_for_game(
  house_id_param uuid,
  game_session_id_param uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  nickname text,
  is_already_invited boolean,
  invitation_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.username,
    p.avatar_url,
    hm.nickname,
    CASE 
      WHEN gi.id IS NOT NULL THEN true
      ELSE false
    END as is_already_invited,
    gi.status as invitation_status
  FROM house_members hm
  JOIN profiles p ON p.id = hm.user_id
  LEFT JOIN game_invitations gi ON gi.invitee_id = p.id 
    AND gi.game_session_id = game_session_id_param
  WHERE hm.house_id = house_id_param
    AND hm.user_id IS NOT NULL
    AND p.id IS NOT NULL
    AND hm.user_id != auth.uid() -- Don't include current user
  ORDER BY hm.nickname ASC, p.username ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_house_members_with_profiles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_players_for_game(uuid, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_house_members_with_profiles IS 'Returns all house members with their profile information, filtering out null users';
COMMENT ON FUNCTION get_available_players_for_game IS 'Returns available players for game invitations with invitation status';