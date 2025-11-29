/*
  # Create Game Invitations System

  ## Summary
  Creates a comprehensive game invitation system that requires explicit acceptance
  before users are added to houses or games, ensuring no profile/stats changes
  without user consent.

  ## Changes

  ### 1. Create game_invitations Table
  - Stores pending invitations to join houses and play games
  - Links inviter, invitee, house, and game
  - Tracks invitation status: pending, accepted, declined
  - Prevents duplicate invitations with unique constraint

  ### 2. RLS Policies
  - Users can view invitations sent to them
  - Users can update their own invitations (accept/decline)
  - Game creators can view invitations they sent
  - Only authenticated users can create invitations

  ### 3. Functions
  - accept_game_invitation: Accepts invite, joins house, and returns session info
  - decline_game_invitation: Declines invite with no side effects

  ### 4. Security
  - No automatic house joining without acceptance
  - Stats only update after acceptance
  - Expired invitations (7 days old) can be cleaned up
*/

-- Step 1: Drop existing functions if they exist
DROP FUNCTION IF EXISTS accept_game_invitation(uuid);
DROP FUNCTION IF EXISTS decline_game_invitation(uuid);
DROP FUNCTION IF EXISTS auto_join_house_on_game_invite(uuid, uuid);

-- Step 2: Create game_invitations table
CREATE TABLE IF NOT EXISTS game_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  game_session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(invitee_id, game_session_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_invitations_invitee_status ON game_invitations(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_game_invitations_session ON game_invitations(game_session_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_created_at ON game_invitations(created_at);

-- Enable RLS
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

-- Step 3: RLS Policies

-- Users can view invitations sent to them
CREATE POLICY "Users can view their invitations"
  ON game_invitations
  FOR SELECT
  TO authenticated
  USING (invitee_id = auth.uid());

-- Inviters can view invitations they sent
CREATE POLICY "Inviters can view their sent invitations"
  ON game_invitations
  FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid());

-- Users can update invitations sent to them (accept/decline)
CREATE POLICY "Users can respond to their invitations"
  ON game_invitations
  FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid() AND status = 'pending')
  WITH CHECK (invitee_id = auth.uid());

-- Authenticated users can create invitations
CREATE POLICY "Authenticated users can create invitations"
  ON game_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = auth.uid());

-- Step 4: Function to accept game invitation
CREATE FUNCTION accept_game_invitation(invitation_id uuid)
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

  -- Log analytics event
  INSERT INTO analytics_events (
    user_id,
    event_type,
    event_data
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

-- Step 5: Function to decline game invitation
CREATE FUNCTION decline_game_invitation(invitation_id uuid)
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

  -- Mark invitation as declined
  UPDATE game_invitations
  SET status = 'declined',
      responded_at = now()
  WHERE id = invitation_id;

  -- Log analytics event
  INSERT INTO analytics_events (
    user_id,
    event_type,
    event_data
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_game_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_game_invitation(uuid) TO authenticated;

-- Enable realtime for game invitations
ALTER PUBLICATION supabase_realtime ADD TABLE game_invitations;

COMMENT ON TABLE game_invitations IS 'Stores pending game invitations that require explicit user acceptance before joining houses or games';
COMMENT ON FUNCTION accept_game_invitation IS 'Accepts a game invitation, joins the house, and returns session info';
COMMENT ON FUNCTION decline_game_invitation IS 'Declines a game invitation with no side effects on profile or stats';