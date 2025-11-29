/*
  # Fix Search Users Function

  1. Problem
    - Function tries to select display_name from profiles table
    - display_name is actually in user_profile_settings table
    - This causes "column does not exist" error

  2. Solution
    - Join with user_profile_settings table
    - Use COALESCE to fall back to username if no display_name set
    - Remove is_blocked from return (blocking system removed)

  3. Security
    - Maintains existing RLS and authentication checks
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
  ORDER BY p.username
  LIMIT limit_count;
END;
$$;