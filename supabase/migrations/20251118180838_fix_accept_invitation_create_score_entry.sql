/*
  # Fix Accept Game Invitation - Create Score Entry
  
  ## Summary
  Fixes critical bug where invited players don't get score entries created when
  they accept game invitations. This causes them to not appear in game history.
  
  ## Problem
  When a player accepts a game invitation, the function only:
  - Adds them to the house (if needed)
  - Marks invitation as accepted
  But it does NOT create a session_scores entry, so the player never appears
  in the game results even though they accepted and played.
  
  ## Solution
  After accepting the invitation, create a session_scores entry for the player
  with initial score of 0. The score will be updated during gameplay.
  
  ## Changes
  - Add INSERT into session_scores after accepting invitation
  - Create entry for both existing house members and newly joined members
*/

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
  v_already_member boolean := false;
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
    v_already_member := true;
  ELSE
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
  END IF;

  -- Mark invitation as accepted
  UPDATE game_invitations
  SET status = 'accepted',
      responded_at = now()
  WHERE id = invitation_id;

  -- CRITICAL FIX: Create score entry for this player in the game session
  -- Check if score entry already exists (safety check)
  IF NOT EXISTS (
    SELECT 1 FROM session_scores
    WHERE session_id = v_invitation.game_session_id
      AND user_id = auth.uid()
  ) THEN
    INSERT INTO session_scores (
      session_id,
      user_id,
      score,
      is_winner
    )
    VALUES (
      v_invitation.game_session_id,
      auth.uid(),
      0,
      false
    );
  END IF;

  -- Log analytics event
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
    'already_member', v_already_member,
    'message', CASE 
      WHEN v_already_member THEN 'Invitation accepted'
      ELSE 'Successfully joined house: ' || v_house_name
    END,
    'house_name', v_house_name,
    'game_name', v_game_name,
    'game_session_id', v_invitation.game_session_id
  );
END;
$$;
