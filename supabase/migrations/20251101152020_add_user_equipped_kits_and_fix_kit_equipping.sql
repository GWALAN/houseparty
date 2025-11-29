/*
  # Add User Equipped Kits System
  
  ## New Tables
  
  1. **user_equipped_kits** - Stores which kit each user has equipped
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users, unique)
    - `kit_id` (uuid, foreign key to user_kit_catalog)
    - `equipped_at` (timestamptz)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  ## Updated Views
  
  1. **user_profiles_with_kits** - Now properly joins equipped kit data
  
  ## Updated Functions
  
  1. **equip_kit_for_testing** - Now stores equipped kit in user_equipped_kits table
  
  ## Security
  
  - Enable RLS on user_equipped_kits table
  - Users can only view and manage their own equipped kits
*/

-- Create user_equipped_kits table
CREATE TABLE IF NOT EXISTS user_equipped_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  kit_id uuid REFERENCES user_kit_catalog(id) ON DELETE SET NULL,
  equipped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_equipped_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own equipped kits"
  ON user_equipped_kits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own equipped kits"
  ON user_equipped_kits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipped kits"
  ON user_equipped_kits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipped kits"
  ON user_equipped_kits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Drop and recreate user_profiles_with_kits view with proper kit data
DROP VIEW IF EXISTS user_profiles_with_kits;

CREATE VIEW user_profiles_with_kits AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.coins,
  p.level,
  p.experience_points,
  p.selected_banner_id,
  p.created_at,
  p.updated_at,
  p.id as user_id,
  uek.kit_id as equipped_kit_id,
  ukc.name as kit_name,
  ukc.color_scheme as kit_colors,
  ukc.rarity as kit_rarity
FROM profiles p
LEFT JOIN user_equipped_kits uek ON uek.user_id = p.id
LEFT JOIN user_kit_catalog ukc ON ukc.id = uek.kit_id;

-- Drop and recreate equip_kit_for_testing function with proper kit equipping
DROP FUNCTION IF EXISTS equip_kit_for_testing(uuid);

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
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Check if kit exists and get its details
  SELECT name, color_scheme, rarity 
  INTO v_kit_name, v_kit_colors, v_kit_rarity
  FROM user_kit_catalog
  WHERE id = p_kit_id;
  
  IF v_kit_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found'
    );
  END IF;
  
  -- Mark the kit as owned by the user
  UPDATE user_kit_catalog
  SET owned_by_user = true
  WHERE id = p_kit_id;
  
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
