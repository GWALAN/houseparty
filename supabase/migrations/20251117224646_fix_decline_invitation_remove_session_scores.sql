/*
  # Fix Decline Invitation to Remove Session Scores
  
  ## Summary
  Updates the decline_game_invitation function to also remove any session_scores
  entries that were created when the invitation was initially accepted. This ensures
  clean state when a user changes their mind.
  
  ## Changes
  - Update decline_game_invitation to delete session_scores for the declined invitation
  - Ensures no orphaned session scores remain after declining
  
  ## Security
  - Function uses SECURITY DEFINER with proper auth checks
  - Only removes scores for the declining user
*/

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
  -- (in case user accepted then changed their mind)
  DELETE FROM session_scores
  WHERE session_id = v_invitation.game_session_id
    AND user_id = auth.uid();

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
