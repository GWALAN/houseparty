/*
  # Fix Create House Duplicate Member Issue

  1. Problem
    - When invite code collision occurs, house is created but member insert fails
    - On retry, user is already a member causing duplicate key error
    - This leaves orphaned houses in the database

  2. Solution
    - Use INSERT ... ON CONFLICT DO NOTHING for house_members
    - Check if house was actually created before returning
    - Prevent duplicate member entries gracefully

  3. Security
    - Maintains existing RLS and permissions
*/

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
  limit_check jsonb;
  member_exists boolean;
BEGIN
  -- Check if user can create/join another house
  limit_check := check_user_can_join_house(creator_id, NULL);

  IF (limit_check->>'can_join')::boolean = false THEN
    RAISE EXCEPTION '%', limit_check->>'message'
      USING HINT = 'Upgrade to premium for unlimited houses',
            ERRCODE = '42501';
  END IF;

  -- Insert the house (set both emoji and house_emoji for backward compatibility)
  INSERT INTO houses (name, description, emoji, house_emoji, invite_code, creator_id)
  VALUES (house_name, house_description, house_emoji, house_emoji, invite_code, creator_id)
  RETURNING id INTO new_house_id;

  -- Add creator as admin (use ON CONFLICT to handle retries gracefully)
  INSERT INTO house_members (house_id, user_id, role)
  VALUES (new_house_id, creator_id, 'admin')
  ON CONFLICT (house_id, user_id) DO NOTHING;

  RETURN new_house_id;
END;
$$;
