/*
  # Fix check_user_can_join_house Function to Accept Two Parameters

  1. Changes
    - Updates `check_user_can_join_house` to accept both `user_id_param` and `house_id_param`
    - If house_id_param is provided, checks if user is already a member
    - If already a member, allows joining (returns can_join = true)
    - Otherwise, applies the normal house limit check
  
  2. Security
    - Function remains SECURITY DEFINER with proper search_path
    - Maintains existing permissions for authenticated users
*/

-- Drop the old function
DROP FUNCTION IF EXISTS check_user_can_join_house(uuid);

-- Recreate with both parameters (house_id is optional)
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
  is_already_member boolean;
  can_join boolean;
  reason text;
BEGIN
  -- If house_id is provided, check if user is already a member
  IF house_id_param IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM house_members
      WHERE user_id = user_id_param
        AND house_id = house_id_param
    ) INTO is_already_member;
    
    -- If already a member, they can "join" (they're already in)
    IF is_already_member THEN
      RETURN jsonb_build_object(
        'can_join', true,
        'is_premium', check_user_is_premium(user_id_param),
        'current_house_count', get_user_house_count(user_id_param),
        'reason', 'Already a member of this house',
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
    'limit', CASE WHEN is_premium THEN NULL ELSE 2 END
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid, uuid) TO authenticated;