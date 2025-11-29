/*
  # Fix Search Users Function - Final Complete Version

  1. Problem
    - The search_users_by_username function is missing blocked_users filtering
    - Previous migrations had conflicts where later migration removed the block filter
    - Function needs to exclude blocked users in both directions

  2. Solution
    - Recreate function with proper blocked_users filtering
    - Maintain correct LEFT JOIN with user_profile_settings for display_name
    - Use COALESCE to fall back to username if no display_name set
    - Exclude users in blocked_users table (both blocker and blocked directions)

  3. Security
    - SECURITY DEFINER allows bypassing RLS for search functionality
    - Properly filters out current user (auth.uid())
    - Excludes blocked relationships in both directions
*/

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

-- Add helpful comment
COMMENT ON FUNCTION search_users_by_username IS 'Search users by username (case-insensitive prefix match), excluding self and blocked users';
