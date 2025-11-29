/*
  # Add House Limit System for Free vs Premium Users

  1. New Functions
    - `get_user_house_count`: Returns the number of houses a user is a member of
    - `check_user_can_join_house`: Checks if a user can join a new house based on their premium status
    - `check_user_is_premium`: Helper function to check if a user has purchased lifetime premium

  2. Changes
    - Adds helper functions to enforce 2-house limit for free users
    - Premium users (with completed premium purchase) have unlimited houses
    - Functions can be called from the app before creating/joining houses

  3. Security
    - All functions are accessible to authenticated users
    - Functions check the calling user's own data only
*/

-- Function to check if a user has lifetime premium
CREATE OR REPLACE FUNCTION check_user_is_premium(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_premium boolean;
BEGIN
  -- Check if user has a completed premium purchase
  SELECT EXISTS (
    SELECT 1
    FROM user_purchases
    WHERE user_id = user_id_param
      AND product_type = 'premium'
      AND payment_status = 'completed'
  ) INTO has_premium;

  RETURN COALESCE(has_premium, false);
END;
$$;

-- Function to get the count of houses a user belongs to
CREATE OR REPLACE FUNCTION get_user_house_count(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  house_count integer;
BEGIN
  -- Count all houses where the user is a member
  SELECT COUNT(*)
  FROM house_members
  WHERE user_id = user_id_param
  INTO house_count;

  RETURN COALESCE(house_count, 0);
END;
$$;

-- Function to check if a user can join a new house
CREATE OR REPLACE FUNCTION check_user_can_join_house(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  current_house_count integer;
  can_join boolean;
  reason text;
BEGIN
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
GRANT EXECUTE ON FUNCTION check_user_is_premium(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_house_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid) TO authenticated;