/*
  # Fix Kit Equipping Function RLS Issue
  
  1. Changes
    - Modify function to properly handle RLS with INSERT...ON CONFLICT
    - Use separate INSERT and UPDATE operations to avoid RLS conflicts
    - Function now checks if record exists first, then either inserts or updates
  
  2. Security
    - Maintains authentication checks
    - Only allows equipping kits that user owns
    - RLS policies still protect the table
*/

-- Drop and recreate the function with better RLS handling
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
  v_existing_record boolean;
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
  
  -- Check if user already has an equipped kit record
  SELECT EXISTS(
    SELECT 1 FROM user_equipped_kits
    WHERE user_id = v_user_id
  ) INTO v_existing_record;
  
  -- Update or insert based on whether record exists
  IF v_existing_record THEN
    UPDATE user_equipped_kits
    SET 
      kit_id = p_kit_id,
      equipped_at = now(),
      updated_at = now()
    WHERE user_id = v_user_id;
  ELSE
    INSERT INTO user_equipped_kits (user_id, kit_id, equipped_at, updated_at)
    VALUES (v_user_id, p_kit_id, now(), now());
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