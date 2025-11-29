/*
  # Update Apply Kit Function to Store Rarity and Colors

  1. Changes
    - Updates apply_kit_to_house function to also store kit_rarity and kit_color_scheme
    - This ensures animations and effects are properly applied

  2. Security
    - Maintains existing security checks
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
  v_kit_rarity text;
  v_kit_colors jsonb;
  v_is_admin boolean;
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

  -- Check if user is admin of the house
  SELECT role = 'admin' INTO v_is_admin
  FROM house_members
  WHERE house_id = p_house_id AND user_id = v_user_id;

  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You must be a house admin to apply kits'
    );
  END IF;

  -- Get kit details including rarity and color_scheme
  SELECT name, rarity, color_scheme
  INTO v_kit_name, v_kit_rarity, v_kit_colors
  FROM house_kits
  WHERE id = p_kit_id;

  IF v_kit_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found'
    );
  END IF;

  -- Check if user owns this kit
  SELECT EXISTS(
    SELECT 1 FROM user_house_kits
    WHERE user_id = v_user_id AND house_kit_id = p_kit_id
  ) INTO v_user_owns_kit;

  IF NOT v_user_owns_kit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not own this kit'
    );
  END IF;

  -- Update house_customizations with kit ID, rarity, and colors
  UPDATE house_customizations
  SET
    equipped_house_kit_id = p_kit_id,
    kit_rarity = v_kit_rarity,
    kit_color_scheme = v_kit_colors,
    updated_at = now()
  WHERE house_id = p_house_id;

  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO house_customizations (
      house_id,
      equipped_house_kit_id,
      kit_rarity,
      kit_color_scheme,
      updated_at
    )
    VALUES (p_house_id, p_kit_id, v_kit_rarity, v_kit_colors, now());
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit applied to house successfully',
    'kit_name', v_kit_name,
    'kit_rarity', v_kit_rarity
  );
END;
$$;