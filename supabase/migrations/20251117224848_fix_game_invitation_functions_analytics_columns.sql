/*
  # Fix Game Invitation Functions - Analytics Column Names
  
  ## Summary
  Updates accept_game_invitation and decline_game_invitation functions to use
  the correct analytics_events column names (event_name and event_properties
  instead of event_type and event_data).
  
  ## Changes
  - Update accept_game_invitation to use correct column names
  - Update decline_game_invitation to use correct column names
  
  ## Security
  - No changes to security model
  - Functions maintain SECURITY DEFINER status
*/

-- Fix accept_game_invitation function
CREATE OR REPLACE FUNCTION accept_game_invitation(invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_member_count int;
  v_house_name text;
  v_game_name text;
  v_display_name text;
  v_username text;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM game_invitations
  WHERE id = invitation_id
    AND invitee_id = auth.uid()
    AND status = 'pending';

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation not found or already responded to'
    );
  END IF;

  -- Get house and game names
  SELECT h.name, g.name INTO v_house_name, v_game_name
  FROM houses h
  CROSS JOIN games g
  WHERE h.id = v_invitation.house_id
    AND g.id = v_invitation.game_id;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = v_invitation.house_id
      AND user_id = auth.uid()
  ) THEN
    -- Already a member, just mark invitation as accepted
    UPDATE game_invitations
    SET status = 'accepted',
        responded_at = now()
    WHERE id = invitation_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'message', 'Invitation accepted',
      'house_name', v_house_name,
      'game_name', v_game_name,
      'game_session_id', v_invitation.game_session_id
    );
  END IF;

  -- Check member count (50 limit)
  SELECT COUNT(*) INTO v_member_count
  FROM house_members
  WHERE house_id = v_invitation.house_id;

  IF v_member_count >= 50 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'House is full (50 member limit)',
      'house_name', v_house_name
    );
  END IF;

  -- Get user's display name
  SELECT display_name INTO v_display_name
  FROM user_profile_settings
  WHERE user_id = auth.uid();

  -- Fallback to username if no display_name
  IF v_display_name IS NULL OR v_display_name = '' THEN
    SELECT username INTO v_username
    FROM profiles
    WHERE id = auth.uid();
    v_display_name := COALESCE(v_username, 'Player');
  END IF;

  -- Add user to house as member
  INSERT INTO house_members (house_id, user_id, nickname, role)
  VALUES (v_invitation.house_id, auth.uid(), v_display_name, 'member');

  -- Mark invitation as accepted
  UPDATE game_invitations
  SET status = 'accepted',
      responded_at = now()
  WHERE id = invitation_id;

  -- Log analytics event with correct column names
  INSERT INTO analytics_events (
    user_id,
    event_name,
    event_properties
  )
  VALUES (
    auth.uid(),
    'accepted_game_invitation',
    jsonb_build_object(
      'house_id', v_invitation.house_id,
      'house_name', v_house_name,
      'game_id', v_invitation.game_id,
      'game_name', v_game_name,
      'game_session_id', v_invitation.game_session_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_member', false,
    'message', 'Successfully joined house: ' || v_house_name,
    'house_name', v_house_name,
    'game_name', v_game_name,
    'game_session_id', v_invitation.game_session_id
  );
END;
$$;

-- Fix decline_game_invitation function
CREATE OR REPLACE FUNCTION decline_game_invitation(invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM game_invitations
  WHERE id = invitation_id
    AND invitee_id = auth.uid()
    AND status = 'pending';

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation not found or already responded to'
    );
  END IF;

  -- Remove any session scores that might have been created
  DELETE FROM session_scores
  WHERE session_id = v_invitation.game_session_id
    AND user_id = auth.uid();

  -- Mark invitation as declined
  UPDATE game_invitations
  SET status = 'declined',
      responded_at = now()
  WHERE id = invitation_id;

  -- Log analytics event with correct column names
  INSERT INTO analytics_events (
    user_id,
    event_name,
    event_properties
  )
  VALUES (
    auth.uid(),
    'declined_game_invitation',
    jsonb_build_object(
      'house_id', v_invitation.house_id,
      'game_id', v_invitation.game_id,
      'game_session_id', v_invitation.game_session_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation declined'
  );
END;
$$;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION accept_game_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_game_invitation(uuid) TO authenticated;
