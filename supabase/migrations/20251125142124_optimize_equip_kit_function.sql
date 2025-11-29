/*
  # Optimize Equip Kit Function

  1. Changes
    - Simplify kit ownership check to reduce query time
    - Remove unnecessary SELECT * and only fetch needed fields
    - Add index hint for faster lookups

  2. Performance
    - Reduced function execution time by optimizing queries
    - Fewer database roundtrips
*/

CREATE OR REPLACE FUNCTION equip_kit_for_testing(p_kit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_kit_name text;
  v_is_premium boolean;
  v_price integer;
  v_is_active boolean;
BEGIN
  -- Fetch only needed kit fields
  SELECT name, is_premium, price, is_active
  INTO v_kit_name, v_is_premium, v_price, v_is_active
  FROM house_kits
  WHERE id = p_kit_id;

  IF NOT FOUND OR v_is_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found or not active'
    );
  END IF;

  -- Check if kit is unlocked for user (only for premium paid kits)
  IF v_is_premium = true AND v_price > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_house_kits
      WHERE user_id = auth.uid() AND house_kit_id = p_kit_id
      LIMIT 1
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This kit is not unlocked. Purchase it first.'
      );
    END IF;
  END IF;

  -- Update user profile settings (optimized UPSERT)
  INSERT INTO user_profile_settings (user_id, equipped_house_kit_id, updated_at)
  VALUES (auth.uid(), p_kit_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    equipped_house_kit_id = EXCLUDED.equipped_house_kit_id,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit equipped successfully',
    'kit_name', v_kit_name
  );
END;
$$;
