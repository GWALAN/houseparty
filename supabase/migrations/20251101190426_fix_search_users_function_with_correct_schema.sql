/*
  # Fix search_users_by_username Function
  
  1. Changes
    - Update search_users_by_username to use correct schema
    - display_name is in user_profile_settings, not profiles
    - avatar_url is in profiles table
  
  2. Notes
    - Function returns username from profiles
    - display_name from user_profile_settings (defaults to username if null)
    - avatar_url from profiles
*/

-- Drop existing function
DROP FUNCTION IF EXISTS search_users_by_username(text, int);

-- Create updated function with correct schema
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
