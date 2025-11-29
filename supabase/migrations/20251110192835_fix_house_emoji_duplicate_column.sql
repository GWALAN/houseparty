/*
  # Fix House Emoji Duplicate Column

  1. Problem
    - houses table has TWO emoji columns: emoji and house_emoji
    - create_house_with_admin function sets emoji (correct)
    - App displays house_emoji (which has default 🏠, wrong!)
    - This causes selected emojis not to appear

  2. Solution
    - Copy emoji values to house_emoji for existing houses
    - Keep house_emoji column for now (used by app)
    - Update all references to use house_emoji consistently
    
  3. Changes
    - Migrate emoji data to house_emoji
    - Update create_house_with_admin to set house_emoji
*/

-- First, copy existing emoji values to house_emoji
UPDATE houses
SET house_emoji = emoji
WHERE house_emoji IS NULL OR house_emoji = '🏠';

-- Update the create_house_with_admin function to use house_emoji
CREATE OR REPLACE FUNCTION create_house_with_admin(
  house_name text,
  house_description text,
  house_emoji text,
  invite_code text,
  creator_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_house_id uuid;
BEGIN
  -- Insert the house with both emoji fields set
  INSERT INTO houses (name, description, emoji, house_emoji, invite_code, creator_id)
  VALUES (house_name, house_description, house_emoji, house_emoji, invite_code, creator_id)
  RETURNING id INTO new_house_id;
  
  -- Add creator as admin
  INSERT INTO house_members (house_id, user_id, role)
  VALUES (new_house_id, creator_id, 'admin');
  
  RETURN new_house_id;
END;
$$;
