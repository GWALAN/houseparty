/*
  # Create Blocked Users System
  
  Allow users to block other users completely
*/

-- blocked_users table already exists, add missing functions

-- Function to block a user
CREATE OR REPLACE FUNCTION block_user(blocked_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF current_user_id = blocked_user_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Insert block record
  INSERT INTO blocked_users (user_id, blocked_user_id)
  VALUES (current_user_id, blocked_user_id)
  ON CONFLICT DO NOTHING;

  -- Remove friendships in both directions
  DELETE FROM friendships
  WHERE (user_id = current_user_id AND friend_id = blocked_user_id)
     OR (user_id = blocked_user_id AND friend_id = current_user_id);

  -- Reject any pending friend requests in both directions
  UPDATE friend_requests
  SET status = 'rejected'
  WHERE (sender_id = current_user_id AND recipient_id = blocked_user_id AND status = 'pending')
     OR (sender_id = blocked_user_id AND recipient_id = current_user_id AND status = 'pending');
END;
$$;

-- Function to unblock a user
CREATE OR REPLACE FUNCTION unblock_user(blocked_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Remove block record
  DELETE FROM blocked_users
  WHERE user_id = current_user_id
    AND blocked_user_id = blocked_user_id;
END;
$$;

-- Function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(user_id_to_check uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
  is_blocked boolean;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if current user blocked the target, or if target blocked current user
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (user_id = current_user_id AND blocked_user_id = user_id_to_check)
       OR (user_id = user_id_to_check AND blocked_user_id = current_user_id)
  ) INTO is_blocked;

  RETURN is_blocked;
END;
$$;