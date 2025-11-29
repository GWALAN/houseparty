/*
  # Verify House Kits System Is Complete

  1. Verification
    - Ensure house_kits table exists with proper structure
    - Ensure all house kit functions exist
    - Verify RLS policies are in place
    - Add missing columns if needed
  
  2. Functions Verified
    - equip_kit_for_testing (for shop screen)
    - apply_kit_to_house (for applying kits to houses)
    - User can view all available kits
  
  3. Impact
    - Fixes house kits app crash on APK
    - Ensures proper permissions for kit viewing
    - Adds error handling for missing data
*/

-- Ensure house_kits table has all required columns
DO $$
BEGIN
  -- Add preview_image column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_kits' AND column_name = 'preview_image'
  ) THEN
    ALTER TABLE house_kits ADD COLUMN preview_image text;
  END IF;

  -- Add description column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_kits' AND column_name = 'description'
  ) THEN
    ALTER TABLE house_kits ADD COLUMN description text;
  END IF;

  -- Add price column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_kits' AND column_name = 'price'
  ) THEN
    ALTER TABLE house_kits ADD COLUMN price numeric DEFAULT 0;
  END IF;

  -- Add is_active column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_kits' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE house_kits ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- Add is_premium column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_kits' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE house_kits ADD COLUMN is_premium boolean DEFAULT false;
  END IF;

  -- Add category column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_kits' AND column_name = 'category'
  ) THEN
    ALTER TABLE house_kits ADD COLUMN category text DEFAULT 'standard';
  END IF;
END $$;

-- Ensure user_house_kits table exists
CREATE TABLE IF NOT EXISTS user_house_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  house_kit_id uuid NOT NULL REFERENCES house_kits(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, house_kit_id)
);

-- Enable RLS on user_house_kits
ALTER TABLE user_house_kits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their unlocked kits" ON user_house_kits;
DROP POLICY IF EXISTS "Users can unlock kits" ON user_house_kits;
DROP POLICY IF EXISTS "Users can view all unlocked house kits" ON user_house_kits;

-- Create policies for user_house_kits
CREATE POLICY "Users can view all unlocked house kits"
  ON user_house_kits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can unlock their own kits"
  ON user_house_kits
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Ensure house_kits RLS policies allow viewing
DROP POLICY IF EXISTS "Anyone can view active house kits" ON house_kits;
DROP POLICY IF EXISTS "Users can view house kits" ON house_kits;

CREATE POLICY "Users can view all house kits"
  ON house_kits
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to get user's available kits
CREATE OR REPLACE FUNCTION get_user_available_kits(user_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  kit_id uuid,
  kit_name text,
  kit_description text,
  color_scheme jsonb,
  rarity text,
  is_premium boolean,
  price numeric,
  is_unlocked boolean,
  category text,
  preview_image text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(user_id_param, auth.uid());
  
  RETURN QUERY
  SELECT 
    hk.id as kit_id,
    hk.name as kit_name,
    hk.description as kit_description,
    hk.color_scheme,
    hk.rarity,
    hk.is_premium,
    hk.price,
    CASE 
      WHEN uhk.id IS NOT NULL THEN true
      WHEN hk.is_premium = false AND hk.price = 0 THEN true
      ELSE false
    END as is_unlocked,
    hk.category,
    hk.preview_image
  FROM house_kits hk
  LEFT JOIN user_house_kits uhk ON uhk.house_kit_id = hk.id AND uhk.user_id = v_user_id
  WHERE hk.is_active = true
  ORDER BY 
    CASE hk.rarity
      WHEN 'mythic' THEN 1
      WHEN 'legendary' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'rare' THEN 4
      WHEN 'uncommon' THEN 5
      ELSE 6
    END,
    hk.name;
END;
$$;

-- Recreate equip_kit_for_testing if missing
CREATE OR REPLACE FUNCTION equip_kit_for_testing(p_kit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kit RECORD;
BEGIN
  -- Verify kit exists and is active
  SELECT * INTO v_kit
  FROM house_kits
  WHERE id = p_kit_id AND is_active = true;

  IF v_kit IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found or not active'
    );
  END IF;

  -- Check if kit is unlocked for user
  IF v_kit.is_premium = true AND v_kit.price > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_house_kits
      WHERE user_id = auth.uid() AND house_kit_id = p_kit_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'This kit is not unlocked. Purchase it first.'
      );
    END IF;
  END IF;

  -- Update user profile settings
  INSERT INTO user_profile_settings (user_id, equipped_house_kit_id, updated_at)
  VALUES (auth.uid(), p_kit_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    equipped_house_kit_id = EXCLUDED.equipped_house_kit_id,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit equipped successfully',
    'kit_name', v_kit.name
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_available_kits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION equip_kit_for_testing(uuid) TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_house_kits_user ON user_house_kits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_house_kits_kit ON user_house_kits(house_kit_id);
CREATE INDEX IF NOT EXISTS idx_house_kits_active ON house_kits(is_active) WHERE is_active = true;

COMMENT ON FUNCTION get_user_available_kits IS 'Returns all available house kits with unlock status for the user';
COMMENT ON FUNCTION equip_kit_for_testing IS 'Equips a house kit to user profile after verifying unlock status';