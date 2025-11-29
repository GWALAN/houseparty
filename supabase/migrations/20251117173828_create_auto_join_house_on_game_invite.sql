/*
  # Auto-Join House on Game Invitation System

  ## Summary
  Creates a database function and trigger to automatically add users to houses
  when they are invited to play games in houses they're not members of.

  ## Changes

  ### 1. Create Function: auto_join_house_on_game_invite
  - Takes user_id and house_id as parameters
  - Checks if user is already a member of the house
  - If not a member and house is not full (< 50 members):
    - Automatically adds user as a regular member
    - Uses their profile display_name as nickname
    - Returns success status and message

  ### 2. Security
  - Function has SECURITY DEFINER to bypass RLS for automatic joins
  - Only allows joining if house has < 50 members
  - Creates audit trail in analytics_events for tracking

  ## Usage
  Call this function before adding a player to a game session:
  ```sql
  SELECT auto_join_house_on_game_invite(user_id, house_id);
  ```
*/

-- Create function to auto-join house when invited to game
CREATE OR REPLACE FUNCTION auto_join_house_on_game_invite(
  p_user_id uuid,
  p_house_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_count int;
  v_house_name text;
  v_display_name text;
  v_username text;
  v_existing_member_id uuid;
BEGIN
  -- Check if user is already a member
  SELECT id INTO v_existing_member_id
  FROM house_members
  WHERE house_id = p_house_id
    AND user_id = p_user_id;

  IF v_existing_member_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'message', 'User is already a member of this house'
    );
  END IF;

  -- Get house name
  SELECT name INTO v_house_name
  FROM houses
  WHERE id = p_house_id;

  IF v_house_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'House not found'
    );
  END IF;

  -- Check member count (50 limit)
  SELECT COUNT(*) INTO v_member_count
  FROM house_members
  WHERE house_id = p_house_id;

  IF v_member_count >= 50 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'House is full (50 member limit)',
      'house_name', v_house_name
    );
  END IF;

  -- Get user's display name from profile settings
  SELECT display_name INTO v_display_name
  FROM user_profile_settings
  WHERE user_id = p_user_id;

  -- Fallback to username from profiles if no display_name
  IF v_display_name IS NULL OR v_display_name = '' THEN
    SELECT username INTO v_username
    FROM profiles
    WHERE id = p_user_id;
    v_display_name := COALESCE(v_username, 'Player');
  END IF;

  -- Add user to house as member
  INSERT INTO house_members (house_id, user_id, nickname, role)
  VALUES (p_house_id, p_user_id, v_display_name, 'member')
  ON CONFLICT (house_id, user_id) DO NOTHING;

  -- Log analytics event
  INSERT INTO analytics_events (
    user_id,
    event_type,
    event_data
  )
  VALUES (
    p_user_id,
    'auto_joined_house',
    jsonb_build_object(
      'house_id', p_house_id,
      'house_name', v_house_name,
      'trigger', 'game_invitation'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_member', false,
    'message', 'Successfully joined house: ' || v_house_name,
    'house_name', v_house_name
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auto_join_house_on_game_invite(uuid, uuid) TO authenticated;