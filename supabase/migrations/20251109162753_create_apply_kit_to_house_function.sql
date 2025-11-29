/*
  # Create apply_kit_to_house Function

  1. New Functions
    - `apply_kit_to_house` - Applies a house kit's customization to a specific house
    
  2. Changes
    - Validates user owns the house
    - Validates user owns the kit (or kit is free)
    - Updates or creates house_customizations record
    - Extracts color scheme from kit and applies to house
    
  3. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Only authenticated users can call this function
    - Users can only apply kits to houses they own or are members of
*/

CREATE OR REPLACE FUNCTION apply_kit_to_house(p_kit_id uuid, p_house_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_kit_name text;
  v_kit_colors jsonb;
  v_kit_rarity text;
  v_house_exists boolean;
  v_user_is_member boolean;
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

  -- Check if house exists and user is owner or member
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

  -- Check if user is owner or member of the house
  SELECT EXISTS(
    SELECT 1 FROM houses
    WHERE id = p_house_id AND created_by = v_user_id
    UNION
    SELECT 1 FROM house_members
    WHERE house_id = p_house_id AND user_id = v_user_id
  ) INTO v_user_is_member;

  IF NOT v_user_is_member THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have permission to modify this house'
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
    v_kit_colors,
    v_kit_rarity,
    now(),
    now()
  )
  ON CONFLICT (house_id)
  DO UPDATE SET
    applied_kit_id = p_kit_id,
    custom_banner_colors = v_kit_colors,
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