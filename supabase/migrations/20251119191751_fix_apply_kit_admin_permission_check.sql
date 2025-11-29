/*
  # Fix Kit Application to Require Admin Role

  ## Problem
  The apply_kit_to_house function allows ANY member of a house to apply kits,
  but only house admins should be allowed to change house customization.

  ## Solution
  Update the permission check to verify that the user has the 'admin' role
  in the house_members table or is the house creator.

  ## Changes
  - Modify apply_kit_to_house function to check for admin role
  - Return clear error message when non-admin tries to apply kit
*/

CREATE OR REPLACE FUNCTION apply_kit_to_house(p_kit_id uuid, p_house_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_kit_name text;
  v_kit_colors text[];
  v_kit_colors_jsonb jsonb;
  v_kit_rarity text;
  v_house_exists boolean;
  v_user_is_admin boolean;
  v_user_owns_kit boolean;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check if kit exists in house_kits
  SELECT name, color_scheme, rarity 
  INTO v_kit_name, v_kit_colors, v_kit_rarity
  FROM house_kits
  WHERE id = p_kit_id;

  IF v_kit_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found'
    );
  END IF;

  -- Convert text[] to jsonb
  v_kit_colors_jsonb := to_jsonb(v_kit_colors);

  -- Check if house exists
  SELECT EXISTS(
    SELECT 1 FROM houses
    WHERE id = p_house_id
  ) INTO v_house_exists;

  IF NOT v_house_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'House not found'
    );
  END IF;

  -- Check if user is an ADMIN of the house (either creator or has admin role)
  SELECT EXISTS(
    -- User is the house creator
    SELECT 1 FROM houses
    WHERE id = p_house_id AND creator_id = v_user_id
    UNION
    -- User is a member with admin role
    SELECT 1 FROM house_members
    WHERE house_id = p_house_id 
      AND user_id = v_user_id 
      AND role = 'admin'
  ) INTO v_user_is_admin;

  IF NOT v_user_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must be an admin of this house to apply kits'
    );
  END IF;

  -- Check if user owns this kit
  SELECT EXISTS(
    SELECT 1 FROM user_house_kits
    WHERE user_id = v_user_id AND house_kit_id = p_kit_id
  ) INTO v_user_owns_kit;

  -- If user doesn't own the kit, check if it's a free kit they can claim
  IF NOT v_user_owns_kit THEN
    -- Add kit to user's collection (for free kits)
    INSERT INTO user_house_kits (user_id, house_kit_id)
    VALUES (v_user_id, p_kit_id)
    ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  END IF;

  -- Update or create house customization
  INSERT INTO house_customizations (
    house_id,
    applied_kit_id,
    custom_banner_colors,
    rarity,
    created_at,
    updated_at
  )
  VALUES (
    p_house_id,
    p_kit_id,
    v_kit_colors_jsonb,
    v_kit_rarity,
    now(),
    now()
  )
  ON CONFLICT (house_id)
  DO UPDATE SET
    applied_kit_id = p_kit_id,
    custom_banner_colors = v_kit_colors_jsonb,
    rarity = v_kit_rarity,
    updated_at = now();

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit applied to house successfully',
    'kit_name', v_kit_name
  );
END;
$$;

COMMENT ON FUNCTION apply_kit_to_house IS 'Applies a house kit to a house. Only house admins (creators or members with admin role) can apply kits.';
