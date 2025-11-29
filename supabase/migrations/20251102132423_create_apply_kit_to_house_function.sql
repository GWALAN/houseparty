/*
  # Create Function to Apply Kit to House
  
  1. New Functions
    - `apply_kit_to_house`: Applies a house kit to a house
    - Verifies user is house admin
    - Verifies user owns the kit
    - Updates house_customizations table
  
  2. Security
    - Checks user authentication
    - Verifies house admin role
    - Verifies kit ownership
    - Uses SECURITY DEFINER to bypass RLS for the update
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
  
  -- Check if kit exists
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
  
  IF NOT v_user_owns_kit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not own this kit'
    );
  END IF;
  
  -- Update house_customizations with the equipped kit ID
  UPDATE house_customizations
  SET 
    equipped_house_kit_id = p_kit_id,
    updated_at = now()
  WHERE house_id = p_house_id;
  
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO house_customizations (house_id, equipped_house_kit_id, updated_at)
    VALUES (p_house_id, p_kit_id, now());
  END IF;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit applied to house successfully',
    'kit_name', v_kit_name
  );
END;
$$;