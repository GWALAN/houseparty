/*
  # Add Missing Helper Functions and Final Fixes

  1. Functions Added
    - Function to check if user owns a house kit
    - Function to safely get house details
    - Improved error handling across all functions
  
  2. Additional Fixes
    - Ensure all foreign key constraints have proper cascade behavior
    - Add missing indexes for common queries
    - Fix any remaining parameter naming issues
  
  3. Impact
    - Better error messages throughout the app
    - Improved query performance
    - Consistent behavior across all database functions
*/

-- Function to check if user can access a house
CREATE OR REPLACE FUNCTION user_can_access_house(house_id_param uuid, user_id_param uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(user_id_param, auth.uid());
  
  RETURN EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = house_id_param
    AND user_id = v_user_id
  );
END;
$$;

-- Function to safely get house details with member info
CREATE OR REPLACE FUNCTION get_house_details(house_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house RECORD;
  v_member_count bigint;
  v_user_role text;
  v_is_creator boolean;
BEGIN
  -- Check if user has access
  IF NOT user_can_access_house(house_id_param, auth.uid()) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have access to this house'
    );
  END IF;

  -- Get house details
  SELECT * INTO v_house
  FROM houses
  WHERE id = house_id_param;

  IF v_house IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'House not found'
    );
  END IF;

  -- Get member count
  SELECT COUNT(*) INTO v_member_count
  FROM house_members
  WHERE house_id = house_id_param;

  -- Get user's role
  SELECT role INTO v_user_role
  FROM house_members
  WHERE house_id = house_id_param
  AND user_id = auth.uid();

  -- Check if user is creator
  v_is_creator := (v_house.creator_id = auth.uid());

  RETURN jsonb_build_object(
    'success', true,
    'house', jsonb_build_object(
      'id', v_house.id,
      'name', v_house.name,
      'description', v_house.description,
      'emoji', v_house.emoji,
      'creator_id', v_house.creator_id,
      'created_at', v_house.created_at,
      'member_count', v_member_count,
      'user_role', v_user_role,
      'is_creator', v_is_creator
    )
  );
END;
$$;

-- Function to check if user has unlocked a specific kit
CREATE OR REPLACE FUNCTION user_has_kit(kit_id_param uuid, user_id_param uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_kit RECORD;
BEGIN
  v_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Get kit info
  SELECT * INTO v_kit
  FROM house_kits
  WHERE id = kit_id_param;

  IF v_kit IS NULL THEN
    RETURN false;
  END IF;

  -- Free kits are always unlocked
  IF v_kit.is_premium = false AND v_kit.price = 0 THEN
    RETURN true;
  END IF;

  -- Check if user has unlocked it
  RETURN EXISTS (
    SELECT 1 FROM user_house_kits
    WHERE user_id = v_user_id
    AND house_kit_id = kit_id_param
  );
END;
$$;

-- Add check_user_can_join_house with two parameters (fix for duplicate function name)
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
  v_house_count integer;
  v_is_premium boolean;
  v_can_join boolean;
  v_house_member_count integer;
BEGIN
  -- If house_id provided, check if house is full
  IF house_id_param IS NOT NULL THEN
    SELECT COUNT(*) INTO v_house_member_count
    FROM house_members
    WHERE house_id = house_id_param;

    IF v_house_member_count >= 50 THEN
      RETURN jsonb_build_object(
        'can_join', false,
        'reason', 'house_full',
        'message', 'This house is full (50 member limit)'
      );
    END IF;
  END IF;

  -- Count how many houses the user is currently a member of
  SELECT COUNT(*) INTO v_house_count
  FROM house_members
  WHERE user_id = user_id_param;

  -- Check if user is premium
  SELECT EXISTS (
    SELECT 1 FROM user_purchases
    WHERE user_id = user_id_param
    AND status = 'completed'
    LIMIT 1
  ) INTO v_is_premium;

  -- Free users can join up to 3 houses, premium users have unlimited
  IF v_is_premium THEN
    v_can_join := true;
  ELSE
    v_can_join := v_house_count < 3;
  END IF;

  RETURN jsonb_build_object(
    'can_join', v_can_join,
    'current_house_count', v_house_count,
    'is_premium', v_is_premium,
    'limit', CASE WHEN v_is_premium THEN 999 ELSE 3 END,
    'reason', CASE 
      WHEN v_can_join THEN NULL 
      ELSE 'house_limit_reached' 
    END,
    'message', CASE 
      WHEN v_can_join THEN NULL
      ELSE 'Free users can only join up to 3 houses. Upgrade to premium for unlimited houses.'
    END
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION user_can_access_house(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_house_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_kit(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_join_house(uuid, uuid) TO authenticated;

-- Ensure game_sessions has proper foreign key constraints
ALTER TABLE game_sessions 
DROP CONSTRAINT IF EXISTS game_sessions_house_id_fkey;

ALTER TABLE game_sessions
ADD CONSTRAINT game_sessions_house_id_fkey
FOREIGN KEY (house_id)
REFERENCES houses(id)
ON DELETE CASCADE;

-- Ensure session_scores has proper foreign key constraints
ALTER TABLE session_scores 
DROP CONSTRAINT IF EXISTS session_scores_session_id_fkey;

ALTER TABLE session_scores
ADD CONSTRAINT session_scores_session_id_fkey
FOREIGN KEY (session_id)
REFERENCES game_sessions(id)
ON DELETE CASCADE;

-- Add useful indexes
CREATE INDEX IF NOT EXISTS idx_games_house_id ON games(house_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_house_status_created 
ON game_sessions(house_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_scores_user_session 
ON session_scores(user_id, session_id);

-- Add comments
COMMENT ON FUNCTION user_can_access_house IS 'Checks if a user is a member of a specific house';
COMMENT ON FUNCTION get_house_details IS 'Returns comprehensive house details with member info for the current user';
COMMENT ON FUNCTION user_has_kit IS 'Checks if a user has unlocked a specific house kit';
COMMENT ON FUNCTION check_user_can_join_house IS 'Checks if a user can join a house or create a new one based on limits';