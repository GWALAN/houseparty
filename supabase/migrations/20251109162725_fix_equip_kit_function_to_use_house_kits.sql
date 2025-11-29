/*
  # Fix equip_kit_for_testing Function

  1. Changes
    - Update `equip_kit_for_testing` function to use `house_kits` table instead of non-existent `user_kit_catalog`
    - Ensure kit exists in `house_kits` before equipping
    - Update `user_profile_settings` with the equipped kit
    - Add kit to `user_house_kits` if not already owned
    
  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Only authenticated users can call this function
    - Users can only equip kits to their own profile
*/

-- Drop the old function
DROP FUNCTION IF EXISTS equip_kit_for_testing(uuid);

-- Create the updated function
CREATE OR REPLACE FUNCTION equip_kit_for_testing(p_kit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_kit_name text;
  v_kit_exists boolean;
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
  SELECT name INTO v_kit_name
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

  -- If user doesn't own the kit, add it to their collection (for free kits)
  IF NOT v_user_owns_kit THEN
    INSERT INTO user_house_kits (user_id, house_kit_id)
    VALUES (v_user_id, p_kit_id)
    ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  END IF;

  -- Update user's profile settings with equipped kit
  UPDATE user_profile_settings
  SET equipped_house_kit_id = p_kit_id
  WHERE user_id = v_user_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit equipped successfully',
    'kit_name', v_kit_name
  );
END;
$$;