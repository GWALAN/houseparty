/*
  # Fix Friend Removal to Delete Accepted Requests

  1. Problem
    - When users remove friends, the accepted friend request remains in the database
    - This causes "already exists" error when trying to re-add the same user
    - The unique constraint on friend_requests prevents duplicate requests

  2. Solution
    - Update remove_friendship() to also delete accepted friend requests
    - Update block_user() to handle all friend request statuses
    - This allows users to re-add friends after removal

  3. Security
    - Maintains existing RLS policies
    - Only affects friend_requests with accepted/rejected status
*/

-- Update remove_friendship to also delete accepted friend requests
CREATE OR REPLACE FUNCTION remove_friendship(target_friend_id uuid)
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

  IF current_user_id = target_friend_id THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;

  -- Delete both directions of friendship
  DELETE FROM friendships
  WHERE (user_id = current_user_id AND friend_id = target_friend_id)
     OR (user_id = target_friend_id AND friend_id = current_user_id);

  -- Delete accepted friend requests in both directions
  -- This allows users to send new friend requests after removal
  DELETE FROM friend_requests
  WHERE ((sender_id = current_user_id AND recipient_id = target_friend_id)
     OR (sender_id = target_friend_id AND recipient_id = current_user_id))
     AND status = 'accepted';

END;
$$;

-- Update block_user to delete ALL friend requests (not just update status)
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
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (current_user_id, blocked_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Delete ALL friendships in both directions
  DELETE FROM friendships
  WHERE (user_id = current_user_id AND friend_id = blocked_user_id)
     OR (user_id = blocked_user_id AND friend_id = current_user_id);

  -- Delete ALL friend requests in both directions (any status)
  DELETE FROM friend_requests
  WHERE (sender_id = current_user_id AND recipient_id = blocked_user_id)
     OR (sender_id = blocked_user_id AND recipient_id = current_user_id);

END;
$$;

-- Add comment explaining the behavior
COMMENT ON FUNCTION remove_friendship IS 'Removes friendship in both directions and deletes accepted friend requests to allow re-adding friends';
COMMENT ON FUNCTION block_user IS 'Blocks a user, removes all friendships and friend requests in both directions';
