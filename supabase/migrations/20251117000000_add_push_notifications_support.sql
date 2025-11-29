/*
  # Add Push Notifications Support

  ## Changes
  1. Add push_token column to user_profile_settings for storing device push tokens
  2. Create game_invitations table for tracking game invites
  3. Add RLS policies for notifications
  4. Create function to send game invitations

  ## Purpose
  Enable real-time push notifications for:
  - Friend requests
  - Friend request acceptances
  - Game invitations
*/

-- Add push token column to user profile settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings'
    AND column_name = 'push_token'
  ) THEN
    ALTER TABLE user_profile_settings
    ADD COLUMN push_token text;
  END IF;
END $$;

-- Create game invitations table
CREATE TABLE IF NOT EXISTS game_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  inviter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_session_id, invitee_id)
);

-- Enable RLS on game_invitations
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for game invitations
CREATE POLICY "Users can view invitations they sent"
  ON game_invitations
  FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid());

CREATE POLICY "Users can view invitations they received"
  ON game_invitations
  FOR SELECT
  TO authenticated
  USING (invitee_id = auth.uid());

CREATE POLICY "Users can create game invitations"
  ON game_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Invitees can update invitation status"
  ON game_invitations
  FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

-- Create index for faster invitation lookups
CREATE INDEX IF NOT EXISTS idx_game_invitations_invitee_status
  ON game_invitations(invitee_id, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_game_invitations_session
  ON game_invitations(game_session_id);

-- Create function to send game invitation
CREATE OR REPLACE FUNCTION send_game_invitation(
  p_game_session_id uuid,
  p_invitee_id uuid,
  p_house_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id uuid;
  v_inviter_id uuid;
BEGIN
  v_inviter_id := auth.uid();

  -- Check if user is member of the house
  IF NOT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = p_house_id
    AND user_id = v_inviter_id
  ) THEN
    RAISE EXCEPTION 'You are not a member of this house';
  END IF;

  -- Check if invitee is also a house member
  IF NOT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = p_house_id
    AND user_id = p_invitee_id
  ) THEN
    RAISE EXCEPTION 'Invitee is not a member of this house';
  END IF;

  -- Create or update invitation
  INSERT INTO game_invitations (
    game_session_id,
    inviter_id,
    invitee_id,
    house_id,
    status
  ) VALUES (
    p_game_session_id,
    v_inviter_id,
    p_invitee_id,
    p_house_id,
    'pending'
  )
  ON CONFLICT (game_session_id, invitee_id)
  DO UPDATE SET
    status = 'pending',
    updated_at = now()
  RETURNING id INTO v_invitation_id;

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id
  );
END;
$$;

COMMENT ON FUNCTION send_game_invitation IS 'Send a game invitation to a user';

-- Create function to accept game invitation
CREATE OR REPLACE FUNCTION accept_game_invitation(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_session_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Update invitation status
  UPDATE game_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = p_invitation_id
    AND invitee_id = v_user_id
    AND status = 'pending'
  RETURNING game_session_id INTO v_game_session_id;

  IF v_game_session_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'game_session_id', v_game_session_id
  );
END;
$$;

COMMENT ON FUNCTION accept_game_invitation IS 'Accept a game invitation';

-- Create function to decline game invitation
CREATE OR REPLACE FUNCTION decline_game_invitation(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Update invitation status
  UPDATE game_invitations
  SET status = 'declined', updated_at = now()
  WHERE id = p_invitation_id
    AND invitee_id = v_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION decline_game_invitation IS 'Decline a game invitation';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_game_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_game_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION decline_game_invitation TO authenticated;
