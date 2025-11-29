/*
  # Fix Kit System for User and House Kits
  
  ## Changes
  
  1. **user_profile_settings Table**
    - Add `equipped_kit_id` column (references user_kit_catalog)
    - This stores which user kit a player has equipped for their profile appearance
  
  2. **house_kits Table** - Create table for emoji/theme packs
    - `id` (uuid, primary key)
    - `name` (text) - Kit name
    - `description` (text) - Kit description  
    - `rarity` (text) - Kit rarity level
    - `color_scheme` (text[]) - Array of color hex codes
    - `price_cents` (integer) - Price in cents (0 for free)
    - `is_active` (boolean) - Whether kit is available
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  3. **kit_items Table** - Update to link to house_kits
    - Add `house_kit_id` column to link items to house kits
    - Keep existing structure for backward compatibility
  
  ## Security
  
  - Enable RLS on house_kits
  - All authenticated users can view active house kits
*/

-- Add equipped_kit_id to user_profile_settings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'equipped_kit_id'
  ) THEN
    ALTER TABLE user_profile_settings 
    ADD COLUMN equipped_kit_id uuid REFERENCES user_kit_catalog(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create house_kits table
CREATE TABLE IF NOT EXISTS house_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  rarity text DEFAULT 'common',
  color_scheme text[] DEFAULT ARRAY[]::text[],
  price_cents integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE house_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active house kits"
  ON house_kits FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Add house_kit_id to kit_items if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kit_items' AND column_name = 'house_kit_id'
  ) THEN
    ALTER TABLE kit_items 
    ADD COLUMN house_kit_id uuid REFERENCES house_kits(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Insert sample free house kits with proper conflict handling
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('a1b2c3d4-1111-1111-1111-111111111111'::uuid, 'Sports Pack', 'Essential sports emojis for game tracking', 'common', ARRAY['#10B981', '#059669', '#047857'], 0, true),
  ('a1b2c3d4-2222-2222-2222-222222222222'::uuid, 'Party Pack', 'Fun party emojis for celebrations', 'common', ARRAY['#F59E0B', '#D97706', '#B45309'], 0, true),
  ('a1b2c3d4-3333-3333-3333-333333333333'::uuid, 'Classic Pack', 'Classic emoji set for all occasions', 'common', ARRAY['#3B82F6', '#2563EB', '#1D4ED8'], 0, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  color_scheme = EXCLUDED.color_scheme,
  price_cents = EXCLUDED.price_cents,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Link existing kit_items or create new ones for house kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('b1b2c3d4-1111-1111-1111-111111111111'::uuid, 'Sports Pack Items', 'common', 
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#10B981', '#059669'),
        'text', '#FFFFFF',
        'accent', '#10B981'
      ),
      'emojis', jsonb_build_object(
        'win', '🏆',
        'score', '⚽',
        'player', '👤',
        'game', '🎯'
      )
    ),
    'a1b2c3d4-1111-1111-1111-111111111111'::uuid, false
  ),
  ('b1b2c3d4-2222-2222-2222-222222222222'::uuid, 'Party Pack Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#F59E0B', '#D97706'),
        'text', '#FFFFFF',
        'accent', '#F59E0B'
      ),
      'emojis', jsonb_build_object(
        'win', '🎉',
        'score', '🎊',
        'player', '🥳',
        'game', '🎈'
      )
    ),
    'a1b2c3d4-2222-2222-2222-222222222222'::uuid, false
  ),
  ('b1b2c3d4-3333-3333-3333-333333333333'::uuid, 'Classic Pack Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#3B82F6', '#2563EB'),
        'text', '#FFFFFF',
        'accent', '#3B82F6'
      ),
      'emojis', jsonb_build_object(
        'win', '✅',
        'score', '📊',
        'player', '👥',
        'game', '🎮'
      )
    ),
    'a1b2c3d4-3333-3333-3333-333333333333'::uuid, false
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rarity = EXCLUDED.rarity,
  item_data = EXCLUDED.item_data,
  house_kit_id = EXCLUDED.house_kit_id,
  is_unlockable = EXCLUDED.is_unlockable;