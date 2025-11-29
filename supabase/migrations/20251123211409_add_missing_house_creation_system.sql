/*
  # Add Missing House Creation System
  
  1. Functions
    - `handle_new_house()` - Trigger function to auto-add creator as admin
    - `check_house_member_limit()` - Validates member limit before insert
  
  2. Triggers
    - `on_house_created` - Fires after house insert
    - `enforce_house_member_limit` - Fires before member insert
  
  3. Columns
    - `houses.member_limit` - Default 10 members per house
*/

-- Add member_limit column to houses
ALTER TABLE houses 
  ADD COLUMN IF NOT EXISTS member_limit integer DEFAULT 10;

-- Create handle_new_house function
CREATE OR REPLACE FUNCTION handle_new_house()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if creator_id is not null
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO house_members (house_id, user_id, role)
    VALUES (NEW.id, NEW.creator_id, 'admin')
    ON CONFLICT (house_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create check_house_member_limit function
CREATE OR REPLACE FUNCTION check_house_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_member_count integer;
  max_members integer;
BEGIN
  -- Get current member count and limit
  SELECT COUNT(*), h.member_limit
  INTO current_member_count, max_members
  FROM house_members hm
  JOIN houses h ON h.id = hm.house_id
  WHERE hm.house_id = NEW.house_id
  GROUP BY h.member_limit;
  
  -- Check if limit would be exceeded
  IF current_member_count >= max_members THEN
    RAISE EXCEPTION 'House member limit reached. Maximum % members allowed.', max_members;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for house creation
DROP TRIGGER IF EXISTS on_house_created ON houses;
CREATE TRIGGER on_house_created
  AFTER INSERT ON houses
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_house();

-- Create trigger for member limit enforcement
DROP TRIGGER IF EXISTS enforce_house_member_limit ON house_members;
CREATE TRIGGER enforce_house_member_limit
  BEFORE INSERT ON house_members
  FOR EACH ROW
  EXECUTE FUNCTION check_house_member_limit();