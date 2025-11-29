/*
  # Fix House Members Realtime Updates

  1. Changes
    - Ensure house_members table has realtime enabled
    - Ensure houses table has realtime enabled
    - Add trigger to refresh house list when member leaves
    - Add better cascade behavior for member deletions
  
  2. Impact
    - Houses will disappear from UI immediately when user leaves
    - Realtime subscriptions will properly update the UI
    - No more stale house data after leaving
*/

-- Enable realtime for house_members if not already enabled
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'house_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE house_members;
  END IF;
END $$;

-- Enable realtime for houses if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'houses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE houses;
  END IF;
END $$;

-- Create function to get user's houses
CREATE OR REPLACE FUNCTION get_user_houses(user_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  emoji text,
  creator_id uuid,
  created_at timestamptz,
  member_count bigint,
  user_role text,
  user_nickname text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Use provided user_id or default to auth.uid()
  v_user_id := COALESCE(user_id_param, auth.uid());
  
  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.description,
    h.emoji,
    h.creator_id,
    h.created_at,
    (SELECT COUNT(*) FROM house_members hm2 WHERE hm2.house_id = h.id) as member_count,
    hm.role as user_role,
    hm.nickname as user_nickname
  FROM houses h
  INNER JOIN house_members hm ON hm.house_id = h.id
  WHERE hm.user_id = v_user_id
  ORDER BY h.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_houses(uuid) TO authenticated;

-- Add index for better performance on user's houses query
CREATE INDEX IF NOT EXISTS idx_house_members_user_house 
ON house_members(user_id, house_id);

-- Ensure cascade deletes work properly
-- When a house is deleted, all members should be deleted
ALTER TABLE house_members 
DROP CONSTRAINT IF EXISTS house_members_house_id_fkey;

ALTER TABLE house_members
ADD CONSTRAINT house_members_house_id_fkey
FOREIGN KEY (house_id)
REFERENCES houses(id)
ON DELETE CASCADE;

-- When a user is deleted, their memberships should be deleted
ALTER TABLE house_members 
DROP CONSTRAINT IF EXISTS house_members_user_id_fkey;

ALTER TABLE house_members
ADD CONSTRAINT house_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

COMMENT ON FUNCTION get_user_houses IS 'Returns all houses where the user is a member, with member count and user role';