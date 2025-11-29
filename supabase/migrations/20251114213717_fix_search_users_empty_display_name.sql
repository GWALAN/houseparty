/*
  # Fix Search Users Function - Handle Empty Display Names

  1. Problem
    - COALESCE only handles NULL values, not empty strings
    - Some users have display_name as empty string ('') instead of NULL
    - This causes the search to show blank names instead of falling back to username

  2. Solution
    - Use NULLIF to convert empty strings to NULL first
    - Then COALESCE can properly fall back to username
    - Pattern: COALESCE(NULLIF(ups.display_name, ''), p.username)

  3. No Breaking Changes
    - Same function signature and return type
    - Only internal logic improvement
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
    COALESCE(NULLIF(ups.display_name, ''), p.username) as display_name,
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

COMMENT ON FUNCTION search_users_by_username IS 'Search users by username (case-insensitive prefix match), excluding self and blocked users. Falls back to username if display_name is empty.';
