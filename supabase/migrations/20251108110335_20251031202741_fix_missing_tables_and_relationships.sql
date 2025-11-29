/*
  # Fix Missing Tables and Relationships
  
  This migration adds missing tables and foreign key relationships that the application requires.
  
  ## New Tables
  
  1. `kit_items` - Stores kit/banner items with their design specifications
    - `id` (uuid, primary key)
    - `name` (text) - Name of the kit item
    - `rarity` (text) - Rarity level
    - `item_data` (jsonb) - JSON data with design specs
    - `is_unlockable` (boolean) - Can be unlocked by users
    - `created_at` (timestamptz)
  
  2. `user_kit_catalog` - User's owned/available kits
    - `id` (uuid, primary key)
    - `name` (text) - Kit name
    - `description` (text) - Kit description
    - `rarity` (text) - Rarity level
    - `is_unlockable` (boolean)
    - `is_earnable` (boolean)
    - `is_active` (boolean)
    - `unlock_type` (text) - How to unlock
    - `price_cents` (integer)
    - `unlock_chance` (numeric)
    - `unlock_condition` (text)
    - `owned_by_user` (boolean)
    - `created_at` (timestamptz)
  
  3. `house_premium_status` - Tracks premium status of houses
    - `id` (uuid, primary key)
    - `house_id` (uuid, foreign key to houses)
    - `highest_kit_tier` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  ## Relationships Added
  
  - `houses.emoji_pack_id` -> `emoji_packs.id`
  
  ## Security
  
  - Enable RLS on all new tables
  - Add policies for authenticated users
*/

-- Add missing column to houses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'houses' AND column_name = 'emoji_pack_id'
  ) THEN
    ALTER TABLE houses ADD COLUMN emoji_pack_id uuid REFERENCES emoji_packs(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'houses' AND column_name = 'house_emoji'
  ) THEN
    ALTER TABLE houses ADD COLUMN house_emoji text DEFAULT '🏠';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'houses' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE houses ADD COLUMN creator_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create kit_items table
CREATE TABLE IF NOT EXISTS kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rarity text NOT NULL DEFAULT 'common',
  item_data jsonb DEFAULT '{}'::jsonb,
  is_unlockable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT kit_items_rarity_check CHECK (rarity IN ('free', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'))
);

ALTER TABLE kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kit items are viewable by all authenticated users"
  ON kit_items FOR SELECT
  TO authenticated
  USING (true);

-- Create user_kit_catalog table
CREATE TABLE IF NOT EXISTS user_kit_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  rarity text NOT NULL DEFAULT 'common',
  is_unlockable boolean DEFAULT true,
  is_earnable boolean DEFAULT false,
  is_active boolean DEFAULT true,
  unlock_type text DEFAULT 'free',
  price_cents integer DEFAULT 0,
  unlock_chance numeric DEFAULT 0,
  unlock_condition text,
  owned_by_user boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT user_kit_catalog_rarity_check CHECK (rarity IN ('free', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
  CONSTRAINT user_kit_catalog_unlock_type_check CHECK (unlock_type IN ('free', 'purchasable', 'chance_based'))
);

ALTER TABLE user_kit_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User kit catalog is viewable by all authenticated users"
  ON user_kit_catalog FOR SELECT
  TO authenticated
  USING (true);

-- Create house_premium_status table
CREATE TABLE IF NOT EXISTS house_premium_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  highest_kit_tier text DEFAULT 'free',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(house_id)
);

ALTER TABLE house_premium_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "House premium status viewable by house members"
  ON house_premium_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_premium_status.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "House premium status updatable by house admins"
  ON house_premium_status FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_premium_status.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = house_premium_status.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );

-- Add foreign key constraint for houses.emoji_pack_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'houses_emoji_pack_id_fkey'
    AND table_name = 'houses'
  ) THEN
    ALTER TABLE houses
    ADD CONSTRAINT houses_emoji_pack_id_fkey
    FOREIGN KEY (emoji_pack_id) REFERENCES emoji_packs(id);
  END IF;
END $$;