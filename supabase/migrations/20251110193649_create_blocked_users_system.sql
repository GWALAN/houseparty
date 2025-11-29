/*
  # Create Blocked Users System

  1. Purpose
    - Allow users to block other users completely
    - Blocked users cannot see blocker in search results
    - Blocked users cannot send friend requests to blocker
    - Blocking removes existing friendships
    - Blocker cannot see blocked users in searches

  2. New Tables
    - `blocked_users`
      - `id` (uuid, primary key)
      - `blocker_id` (uuid, references profiles.id) - User who initiated the block
      - `blocked_id` (uuid, references profiles.id) - User who is blocked
      - `created_at` (timestamp)
      - Unique constraint on (blocker_id, blocked_id)
      - Check constraint: blocker_id != blocked_id

  3. Security
    - Enable RLS
    - Users can only see their own blocks
    - Users cannot see who has blocked them
    - Users can insert/delete their own blocks only

  4. Functions
    - `block_user(blocked_user_id uuid)` - Blocks a user and removes friendship
    - `unblock_user(blocked_user_id uuid)` - Unblocks a user
    - `is_user_blocked(user_id_to_check uuid)` - Check if current user blocked someone
    - Update search_users function to exclude blocked users

  5. Triggers
    - When a user is blocked, remove all friendships between them
    - When a user is blocked, reject any pending friend requests
*/

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK(blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can only see blocks they created
CREATE POLICY "Users can view own blocks"
  ON blocked_users FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can block others"
  ON blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Users can remove their own blocks
CREATE POLICY "Users can unblock others"
  ON blocked_users FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

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

  -- Insert block record (will fail if already exists due to unique constraint)
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (current_user_id, blocked_user_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

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
  WHERE blocker_id = current_user_id
    AND blocked_id = blocked_user_id;

END;
$$;

-- Function to check if a user is blocked (either direction)
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
    WHERE (blocker_id = current_user_id AND blocked_id = user_id_to_check)
       OR (blocker_id = user_id_to_check AND blocked_id = current_user_id)
  ) INTO is_blocked;

  RETURN is_blocked;
END;
$$;

-- Update search_users function to exclude blocked users
CREATE OR REPLACE FUNCTION search_users(search_query text)
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
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    COALESCE(ups.display_name, p.username) as display_name,
    p.avatar_url,
    EXISTS (
      SELECT 1 FROM friendships f 
      WHERE f.user_id = current_user_id AND f.friend_id = p.id
    ) as is_friend,
    EXISTS (
      SELECT 1 FROM friend_requests fr 
      WHERE fr.sender_id = current_user_id 
        AND fr.recipient_id = p.id 
        AND fr.status = 'pending'
    ) as has_pending_request,
    EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE (bu.blocker_id = current_user_id AND bu.blocked_id = p.id)
         OR (bu.blocker_id = p.id AND bu.blocked_id = current_user_id)
    ) as is_blocked
  FROM profiles p
  LEFT JOIN user_profile_settings ups ON ups.user_id = p.id
  WHERE p.id != current_user_id
    AND (
      p.username ILIKE '%' || search_query || '%'
      OR ups.display_name ILIKE '%' || search_query || '%'
    )
    -- Exclude users who have blocked current user or whom current user has blocked
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE (bu.blocker_id = current_user_id AND bu.blocked_id = p.id)
         OR (bu.blocker_id = p.id AND bu.blocked_id = current_user_id)
    )
    -- Exclude private profiles unless they are friends
    AND (
      NOT EXISTS (
        SELECT 1 FROM user_profile_settings s 
        WHERE s.user_id = p.id AND s.is_private = true
      )
      OR EXISTS (
        SELECT 1 FROM friendships f 
        WHERE f.user_id = current_user_id AND f.friend_id = p.id
      )
    )
  ORDER BY p.username
  LIMIT 50;
END;
$$;

-- Add RLS policy to prevent friend requests to/from blocked users
CREATE POLICY "Cannot send friend requests to blocked users"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = recipient_id)
         OR (bu.blocker_id = recipient_id AND bu.blocked_id = auth.uid())
    )
  );
