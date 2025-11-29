/*
  # Restrict Kit Application to House Creators Only

  ## Problem
  The apply_kit_to_house function currently allows both house creators and admin members
  to apply kits, but house customization should only be controlled by the house creator.

  ## Solution
  Update the permission check to ONLY allow house creators to apply kits.
  Remove the check for admin members.

  ## Changes
  - Modify apply_kit_to_house function to check ONLY creator_id
  - Remove the union check for admin role in house_members
  - Update error message to clarify only creators can apply kits
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
  v_user_is_creator boolean;
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

  -- Check if user is the CREATOR of the house (ONLY creators can apply kits)
  SELECT EXISTS(
    SELECT 1 FROM houses
    WHERE id = p_house_id AND creator_id = v_user_id
  ) INTO v_user_is_creator;

  IF NOT v_user_is_creator THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only the house creator can apply kits to this house'
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

COMMENT ON FUNCTION apply_kit_to_house IS 'Applies a house kit to a house. Only house creators can apply kits - admin members cannot change house customization.';
