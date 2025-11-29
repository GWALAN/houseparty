/*
  # Fix Search Users to Exclude Blocked Users

  1. Changes
    - Update search_users_by_username to exclude blocked users (both directions)
    - Users who have blocked the current user won't appear in search
    - Users that the current user has blocked won't appear in search
    - When unblocking, users can search and send friend requests again

  2. Security
    - Maintains existing RLS and authentication checks
    - Properly handles both directions of blocking
*/

-- Drop and recreate the search function with block filtering
DROP FUNCTION IF EXISTS search_users_by_username(text, int);

CREATE OR REPLACE FUNCTION search_users_by_username(search_term text, limit_count int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_friend boolean,
  has_pending_request boolean
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
    COALESCE(ups.display_name, p.username) as display_name,
    p.avatar_url,
    EXISTS(
      SELECT 1 FROM friendships f 
      WHERE f.user_id = auth.uid() AND f.friend_id = p.id
    ) as is_friend,
    EXISTS(
      SELECT 1 FROM friend_requests fr
      WHERE fr.sender_id = auth.uid() AND fr.recipient_id = p.id AND fr.status = 'pending'
    ) as has_pending_request
  FROM profiles p
  LEFT JOIN user_profile_settings ups ON ups.user_id = p.id
  WHERE 
    p.id != auth.uid()
    AND LOWER(p.username) LIKE LOWER(search_term || '%')
    -- Exclude users in blocked_users table (both directions)
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = p.id)
         OR (bu.blocker_id = p.id AND bu.blocked_id = auth.uid())
    )
  ORDER BY p.username
  LIMIT limit_count;
END;
$$;