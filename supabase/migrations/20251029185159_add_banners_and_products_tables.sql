/*
  # Add Banners and Products Tables

  1. New Tables
    - `banners` - Profile banner items
      - `id` (uuid, primary key)
      - `name` (text)
      - `rarity` (text) - free, common, uncommon, rare, epic, legendary, mythic
      - `item_data` (jsonb) - gradient colors, style info, etc
      - `is_animated` (boolean)
      - `style_key` (text) - identifier for banner style
      - `is_unlockable` (boolean)
      - `is_earnable` (boolean)
      - `kit_id` (uuid) - optional, if part of a kit
      - `kit_name` (text)
      - `created_at` (timestamptz)
    
    - `products` - Shop products (coins, premium items)
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `product_type` (text) - coins, premium, kit
      - `price_cents` (integer)
      - `bonus_coins` (integer) - for coin packages
      - `is_featured` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on new tables
    - Public read access for banners and products
    - No write access for regular users
*/

-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('free', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
  item_data jsonb DEFAULT '{}'::jsonb,
  is_animated boolean DEFAULT false,
  style_key text NOT NULL,
  is_unlockable boolean DEFAULT true,
  is_earnable boolean DEFAULT false,
  kit_id uuid,
  kit_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to banners"
  ON banners FOR SELECT
  TO authenticated
  USING (true);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  product_type text NOT NULL CHECK (product_type IN ('coins', 'premium', 'kit')),
  price_cents integer NOT NULL DEFAULT 0,
  bonus_coins integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

-- Fix house_members RLS policies (remove recursive policies)
DROP POLICY IF EXISTS "Members can view house members" ON house_members;
DROP POLICY IF EXISTS "Users can view house members" ON house_members;
DROP POLICY IF EXISTS "Users can view houses they are members of" ON house_members;
DROP POLICY IF EXISTS "Members can view their memberships" ON house_members;

CREATE POLICY "Users can view their own memberships"
  ON house_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memberships"
  ON house_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update house members"
  ON house_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members hm
      WHERE hm.house_id = house_members.house_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members hm
      WHERE hm.house_id = house_members.house_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete house members"
  ON house_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members hm
      WHERE hm.house_id = house_members.house_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );
