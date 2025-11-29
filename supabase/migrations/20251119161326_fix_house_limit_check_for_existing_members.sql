/*
  # Fix House Limit Check for Existing Members

  ## Problem
  When a user is invited to a game in a house they're already a member of,
  the house limit check incorrectly blocks them because it counts ALL houses
  they're in, including the one they're trying to accept an invitation for.

  ## Solution
  Update check_user_can_join_house to:
  1. Accept an optional house_id parameter
  2. If provided, check if user is already a member of that specific house
  3. If already a member, always return can_join = true (no limit check needed)
  4. If not a member, do the normal limit check

  ## Changes
  - Modify check_user_can_join_house function signature
  - Add logic to check existing membership for specific house
*/

-- Drop the old function
DROP FUNCTION IF EXISTS check_user_can_join_house(uuid);

-- Create updated function with optional house_id parameter
CREATE OR REPLACE FUNCTION check_user_can_join_house(
  user_id_param uuid,
  house_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  current_house_count integer;
  is_already_member boolean := false;
  can_join boolean;
  reason text;
BEGIN
  -- If house_id is provided, check if user is already a member
  IF house_id_param IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM house_members
      WHERE house_id = house_id_param
        AND user_id = user_id_param
    ) INTO is_already_member;

    -- If already a member, they can always "join" (it's just accepting a game invite)
    IF is_already_member THEN
      RETURN jsonb_build_object(
        'can_join', true,
        'is_premium', check_user_is_premium(user_id_param),
        'current_house_count', get_user_house_count(user_id_param),
        'reason', 'Already a member of this house',
        'already_member', true,
        'limit', NULL
      );
    END IF;
  END IF;

  -- Check if user is premium
  is_premium := check_user_is_premium(user_id_param);
  
  -- Get current house count
  current_house_count := get_user_house_count(user_id_param);

  -- Premium users can always join
  IF is_premium THEN
    can_join := true;
    reason := 'Premium user - unlimited houses';
  -- Free users limited to 2 houses
  ELSIF current_house_count < 2 THEN
    can_join := true;
    reason := 'Within free tier limit';
  ELSE
    can_join := false;
    reason := 'Free tier limit reached (2 houses max)';
  END IF;

  RETURN jsonb_build_object(
    'can_join', can_join,
    'is_premium', is_premium,
    'current_house_count', current_house_count,
    'reason', reason,
    'already_member', false,
    'limit', CASE WHEN is_premium THEN NULL ELSE 2 END
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION check_user_can_join_house IS 'Checks if a user can join a house. If house_id provided and user is already a member, always returns true.';
