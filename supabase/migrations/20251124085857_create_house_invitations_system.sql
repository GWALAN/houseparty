/*
  # Create House Invitations System

  ## Summary
  Creates a comprehensive house invitation system that allows users to be invited
  to join houses, similar to game invitations but for house membership.

  ## Changes

  ### 1. Create house_invitations Table
  - Stores pending invitations to join houses
  - Links inviter, invitee, and house
  - Tracks invitation status: pending, accepted, declined
  - Prevents duplicate invitations with unique constraint

  ### 2. RLS Policies
  - Users can view invitations sent to them
  - Users can update their own invitations (accept/decline)
  - House admins can view invitations they sent
  - Only authenticated users can create invitations

  ### 3. Functions
  - accept_house_invitation: Accepts invite and joins house
  - decline_house_invitation: Declines invite with no side effects

  ### 4. Security
  - No automatic house joining without acceptance
  - Respects house member limits (50 max, 3 for free users)
  - Checks premium status for house limits
*/

-- Create house_invitations table
CREATE TABLE IF NOT EXISTS house_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(invitee_id, house_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_house_invitations_invitee_status ON house_invitations(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_house_invitations_house ON house_invitations(house_id);
CREATE INDEX IF NOT EXISTS idx_house_invitations_created_at ON house_invitations(created_at DESC);

-- Enable RLS
ALTER TABLE house_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view invitations sent to them
CREATE POLICY "Users can view their house invitations"
  ON house_invitations
  FOR SELECT
  TO authenticated
  USING (invitee_id = auth.uid());

-- Inviters can view invitations they sent
CREATE POLICY "Inviters can view their sent house invitations"
  ON house_invitations
  FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid());

-- Users can update invitations sent to them (accept/decline)
CREATE POLICY "Users can respond to their house invitations"
  ON house_invitations
  FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid() AND status = 'pending')
  WITH CHECK (invitee_id = auth.uid());

-- House admins can create invitations
CREATE POLICY "House admins can create house invitations"
  ON house_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_id = house_invitations.house_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to accept house invitation
CREATE OR REPLACE FUNCTION accept_house_invitation(invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_member_count int;
  v_house_name text;
  v_display_name text;
  v_username text;
  v_user_house_count int;
  v_is_premium boolean;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM house_invitations
  WHERE id = invitation_id
    AND invitee_id = auth.uid()
    AND status = 'pending';

  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation not found or already responded to'
    );
  END IF;

  -- Get house name
  SELECT name INTO v_house_name
  FROM houses
  WHERE id = v_invitation.house_id;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = v_invitation.house_id
      AND user_id = auth.uid()
  ) THEN
    -- Already a member, just mark invitation as accepted
    UPDATE house_invitations
    SET status = 'accepted',
        responded_at = now()
    WHERE id = invitation_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'message', 'You are already a member of this house',
      'house_name', v_house_name
    );
  END IF;

  -- Check house member count (50 limit)
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

  -- Check user's house count and premium status
  SELECT COUNT(*) INTO v_user_house_count
  FROM house_members
  WHERE user_id = auth.uid();

  SELECT EXISTS (
    SELECT 1 FROM user_purchases
    WHERE user_id = auth.uid()
    AND status = 'completed'
    LIMIT 1
  ) INTO v_is_premium;

  -- Free users can only join 3 houses
  IF NOT v_is_premium AND v_user_house_count >= 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Free users can only join up to 3 houses. Upgrade to premium for unlimited houses.',
      'current_house_count', v_user_house_count,
      'limit', 3
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
  UPDATE house_invitations
  SET status = 'accepted',
      responded_at = now()
  WHERE id = invitation_id;

  -- Log analytics event
  INSERT INTO analytics_events (
    user_id,
    event_name,
    event_data
  )
  VALUES (
    auth.uid(),
    'accepted_house_invitation',
    jsonb_build_object(
      'house_id', v_invitation.house_id,
      'house_name', v_house_name,
      'inviter_id', v_invitation.inviter_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully joined house: ' || v_house_name,
    'house_name', v_house_name,
    'house_id', v_invitation.house_id
  );
END;
$$;

-- Function to decline house invitation
CREATE OR REPLACE FUNCTION decline_house_invitation(invitation_id uuid)
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
  FROM house_invitations
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
  UPDATE house_invitations
  SET status = 'declined',
      responded_at = now()
  WHERE id = invitation_id;

  -- Log analytics event
  INSERT INTO analytics_events (
    user_id,
    event_name,
    event_data
  )
  VALUES (
    auth.uid(),
    'declined_house_invitation',
    jsonb_build_object(
      'house_id', v_invitation.house_id,
      'inviter_id', v_invitation.inviter_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'House invitation declined'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_house_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_house_invitation(uuid) TO authenticated;

-- Enable realtime for house invitations
ALTER PUBLICATION supabase_realtime ADD TABLE house_invitations;

COMMENT ON TABLE house_invitations IS 'Stores pending house invitations that require explicit user acceptance before joining houses';
COMMENT ON FUNCTION accept_house_invitation IS 'Accepts a house invitation and joins the house with member role';
COMMENT ON FUNCTION decline_house_invitation IS 'Declines a house invitation with no side effects';