/*
  # Fix Realtime Updates and Search Refresh Issues

  ## Problems Fixed
  1. Search results show stale "Send Friend Request" button after becoming friends
  2. Block actions don't trigger realtime updates for the blocked user
  3. Accept friend has UI delay due to waiting for manual refetch

  ## Solution
  1. Enable realtime for blocked_users table
  2. Update search_users_by_username to check blocked status
  3. Ensure proper realtime triggers for all friendship changes

  ## Security
  - Maintains existing RLS policies
  - Blocked status is properly filtered
*/

-- Step 1: Enable realtime for blocked_users table
ALTER PUBLICATION supabase_realtime ADD TABLE blocked_users;

-- Step 2: Update search function to exclude blocked users and refresh friend status
-- First drop the old function to change return type
DROP FUNCTION IF EXISTS search_users_by_username(text, integer);

CREATE OR REPLACE FUNCTION search_users_by_username(search_term text, limit_count int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_friend boolean,
  has_pending_request boolean,
  is_blocked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    EXISTS(
      SELECT 1 FROM friendships f
      WHERE f.user_id = auth.uid() AND f.friend_id = p.id
    ) as is_friend,
    EXISTS(
      SELECT 1 FROM friend_requests fr
      WHERE fr.sender_id = auth.uid()
      AND fr.recipient_id = p.id
      AND fr.status = 'pending'
    ) as has_pending_request,
    EXISTS(
      SELECT 1 FROM blocked_users bu
      WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = p.id)
         OR (bu.blocker_id = p.id AND bu.blocked_id = auth.uid())
    ) as is_blocked
  FROM profiles p
  WHERE
    p.id != auth.uid()
    AND LOWER(p.username) LIKE LOWER(search_term || '%')
    -- Exclude users who have blocked me or I have blocked
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = p.id)
         OR (bu.blocker_id = p.id AND bu.blocked_id = auth.uid())
    )
  ORDER BY p.username
  LIMIT limit_count;
END;
$$;

-- Step 3: Add index on blocked_users for faster queries
CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON blocked_users(blocked_id);

-- Step 4: Add helpful comments
COMMENT ON FUNCTION search_users_by_username IS 'Search users by username, excluding blocked users and showing current friend/request status';
COMMENT ON TABLE blocked_users IS 'Stores user block relationships - realtime enabled for instant UI updates';
