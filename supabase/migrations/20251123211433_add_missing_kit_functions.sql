/*
  # Add Missing Kit Functions
  
  1. Functions
    - `unlock_kit_for_user()` - Grants kit to user
    - `get_user_owned_kits()` - Returns user's kit collection
*/

-- Create unlock_kit_for_user function
CREATE OR REPLACE FUNCTION unlock_kit_for_user(
  p_user_id uuid,
  p_kit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Insert kit ownership
  INSERT INTO user_house_kits (user_id, house_kit_id)
  VALUES (p_user_id, p_kit_id)
  ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  
  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'kit_id', p_kit_id,
    'user_id', p_user_id
  );
  
  RETURN v_result;
END;
$$;

-- Create get_user_owned_kits function
CREATE OR REPLACE FUNCTION get_user_owned_kits(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  description text,
  rarity text,
  color_scheme text[],
  price_cents integer,
  is_active boolean,
  unlocked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hk.id,
    hk.name,
    hk.description,
    hk.rarity,
    hk.color_scheme,
    hk.price_cents,
    hk.is_active,
    uhk.unlocked_at
  FROM house_kits hk
  JOIN user_house_kits uhk ON uhk.house_kit_id = hk.id
  WHERE uhk.user_id = p_user_id
  ORDER BY uhk.unlocked_at DESC;
END;
$$;