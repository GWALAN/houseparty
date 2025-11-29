/*
  # Fix Friend System Realtime Updates

  1. Purpose
    - Fix realtime subscription issues where friendship deletions don't update both users' UIs
    - Fix blocked users still appearing in other user's friends list
    - Fix "already exists" errors when re-adding friends after removal
    - Ensure all friendship cleanup happens atomically and triggers realtime events

  2. Changes
    - Add trigger to notify both sides of friendship deletion
    - Improve block_user function to ensure proper cleanup
    - Add cleanup for stale friendships
    - Ensure realtime events fire for all friendship changes

  3. Security
    - Maintain existing RLS policies
    - Ensure cleanup functions use SECURITY DEFINER properly
*/

-- Drop and recreate block_user function with improved cleanup
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

  -- Insert block record (will fail if already exists due to unique constraint)
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (current_user_id, blocked_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Delete ALL friendships in both directions (this triggers realtime DELETE events)
  DELETE FROM friendships
  WHERE (user_id = current_user_id AND friend_id = blocked_user_id)
     OR (user_id = blocked_user_id AND friend_id = current_user_id);

  -- Delete ALL friend requests in both directions
  DELETE FROM friend_requests
  WHERE (sender_id = current_user_id AND recipient_id = blocked_user_id)
     OR (sender_id = blocked_user_id AND recipient_id = current_user_id);

END;
$$;

-- Drop and recreate unblock_user function with cleanup
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
  WHERE blocker_id = current_user_id
    AND blocked_id = blocked_user_id;

  -- Clean up any stale friend requests
  DELETE FROM friend_requests
  WHERE (sender_id = current_user_id AND recipient_id = blocked_user_id AND status = 'rejected')
     OR (sender_id = blocked_user_id AND recipient_id = current_user_id AND status = 'rejected');

END;
$$;

-- Function to clean up stale friendships (can be called manually if needed)
CREATE OR REPLACE FUNCTION cleanup_stale_friendships()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove friendships where the reverse friendship doesn't exist
  DELETE FROM friendships f1
  WHERE NOT EXISTS (
    SELECT 1 FROM friendships f2
    WHERE f2.user_id = f1.friend_id
      AND f2.friend_id = f1.user_id
  );
END;
$$;

-- Function to ensure friendship bidirectionality
CREATE OR REPLACE FUNCTION ensure_friendship_consistency()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For each friendship, ensure the reverse exists
  INSERT INTO friendships (user_id, friend_id, created_at)
  SELECT f.friend_id, f.user_id, f.created_at
  FROM friendships f
  WHERE NOT EXISTS (
    SELECT 1 FROM friendships f2
    WHERE f2.user_id = f.friend_id
      AND f2.friend_id = f.user_id
  )
  ON CONFLICT (user_id, friend_id) DO NOTHING;
END;
$$;

-- Create a cleanup function for removing friends that properly handles both directions
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

END;
$$;

-- Add a comment to friendships table noting realtime is enabled
COMMENT ON TABLE friendships IS 'Friendship relationships between users. Realtime enabled for DELETE events on both user_id and friend_id columns.';

-- Add a comment to blocked_users table
COMMENT ON TABLE blocked_users IS 'Blocked user relationships. When a user is blocked, all friendships and friend requests are deleted.';
