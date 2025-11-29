/*
  # Fix Kit Equipping to Update Profile Settings
  
  1. Changes
    - Update equip_kit_for_testing function to write to user_profile_settings table
    - This table stores the equipped_house_kit_id field that the profile page reads
    - Ensures equipped kits are visible on the profile
  
  2. Security
    - Maintains authentication checks
    - Only allows equipping kits that user owns
    - Uses SECURITY DEFINER to bypass RLS for the update
*/

-- Drop and recreate the function to update the correct table
DROP FUNCTION IF EXISTS equip_kit_for_testing(uuid);

CREATE OR REPLACE FUNCTION equip_kit_for_testing(p_kit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_kit_name text;
  v_kit_colors text[];
  v_kit_rarity text;
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
  
  -- Check if kit exists in house_kits and get its details
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
  
  -- Update user_profile_settings with the equipped kit ID
  UPDATE user_profile_settings
  SET 
    equipped_house_kit_id = p_kit_id,
    updated_at = now()
  WHERE user_id = v_user_id;
  
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO user_profile_settings (user_id, equipped_house_kit_id, updated_at)
    VALUES (v_user_id, p_kit_id, now());
  END IF;
  
  -- Return success with kit details
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit equipped successfully',
    'kit_name', v_kit_name,
    'kit_colors', v_kit_colors,
    'kit_rarity', v_kit_rarity
  );
END;
$$;