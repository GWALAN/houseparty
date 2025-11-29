/*
  # Fix House Creation Limit Enforcement

  1. Problem
    - Users can create 3 houses on free tier (should be 2)
    - check_user_can_join_house has limit set to 3
    - create_house_with_admin doesn't enforce limits at database level

  2. Changes
    - Update check_user_can_join_house to enforce 2 house limit for free users
    - Add limit check directly to create_house_with_admin function
    - Ensure both creating AND joining houses count toward limit

  3. Security
    - Database-level enforcement prevents bypassing via API calls
*/

-- Update check_user_can_join_house to have correct limit
CREATE OR REPLACE FUNCTION check_user_can_join_house(
  user_id_param uuid,
  house_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_house_count integer;
  v_is_premium boolean;
  v_can_join boolean;
  v_house_member_count integer;
BEGIN
  -- If house_id provided, check if house is full
  IF house_id_param IS NOT NULL THEN
    SELECT COUNT(*) INTO v_house_member_count
    FROM house_members
    WHERE house_id = house_id_param;

    IF v_house_member_count >= 50 THEN
      RETURN jsonb_build_object(
        'can_join', false,
        'reason', 'house_full',
        'message', 'This house is full (50 member limit)'
      );
    END IF;
  END IF;

  -- Count how many houses the user is currently a member of
  SELECT COUNT(*) INTO v_house_count
  FROM house_members
  WHERE user_id = user_id_param;

  -- Check if user is premium
  SELECT EXISTS (
    SELECT 1 FROM user_purchases
    WHERE user_id = user_id_param
      AND product_type = 'premium'
      AND payment_status = 'completed'
    LIMIT 1
  ) INTO v_is_premium;

  -- Free users can be in up to 2 houses, premium users have unlimited
  IF v_is_premium THEN
    v_can_join := true;
  ELSE
    v_can_join := v_house_count < 2;
  END IF;

  RETURN jsonb_build_object(
    'can_join', v_can_join,
    'current_house_count', v_house_count,
    'is_premium', v_is_premium,
    'limit', CASE WHEN v_is_premium THEN 999 ELSE 2 END,
    'reason', CASE 
      WHEN v_can_join THEN NULL 
      ELSE 'house_limit_reached' 
    END,
    'message', CASE 
      WHEN v_can_join THEN NULL
      ELSE 'Free users can only be in up to 2 houses. Upgrade to premium for unlimited houses.'
    END
  );
END;
$$;

-- Update create_house_with_admin to enforce limits
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
BEGIN
  -- Check if user can create/join another house
  limit_check := check_user_can_join_house(creator_id, NULL);

  IF (limit_check->>'can_join')::boolean = false THEN
    RAISE EXCEPTION '%', limit_check->>'message'
      USING HINT = 'Upgrade to premium for unlimited houses',
            ERRCODE = '42501';
  END IF;

  -- Insert the house
  INSERT INTO houses (name, description, emoji, invite_code, creator_id)
  VALUES (house_name, house_description, house_emoji, invite_code, creator_id)
  RETURNING id INTO new_house_id;

  -- Add creator as admin
  INSERT INTO house_members (house_id, user_id, role)
  VALUES (new_house_id, creator_id, 'admin');

  RETURN new_house_id;
END;
$$;
