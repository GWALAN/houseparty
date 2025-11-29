/*
  # Fix Kit Equipping Function
  
  1. Changes
    - Drop old `equip_kit_for_testing` function
    - Create new version that works with `house_kits` and `user_house_kits` tables
    - Function now checks if user owns the kit in `user_house_kits`
    - Updates `user_equipped_kits` to track which kit is equipped to profile
  
  2. Security
    - Maintains authentication checks
    - Only allows equipping kits that user owns
*/

-- Drop the old function
DROP FUNCTION IF EXISTS equip_kit_for_testing(uuid);

-- Create new function that works with house_kits system
CREATE OR REPLACE FUNCTION equip_kit_for_testing(p_kit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- Insert or update the equipped kit for this user
  INSERT INTO user_equipped_kits (user_id, kit_id, equipped_at, updated_at)
  VALUES (v_user_id, p_kit_id, now(), now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    kit_id = p_kit_id,
    equipped_at = now(),
    updated_at = now();
  
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