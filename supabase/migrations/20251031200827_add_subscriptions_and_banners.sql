/*
  # Add Subscriptions, Banners, and Products Tables

  1. New Tables
    - `subscriptions` - Tracks user subscription status
    - `user_unlocked_banners` - Tracks which banners users have unlocked
    - `banners` - Profile banner items
    - `products` - Shop products (coins, premium items)

  2. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'vip')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create user_unlocked_banners table
CREATE TABLE IF NOT EXISTS user_unlocked_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_id uuid NOT NULL,
  unlocked_at timestamptz DEFAULT now()
);

ALTER TABLE user_unlocked_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocked banners"
  ON user_unlocked_banners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unlocked banners"
  ON user_unlocked_banners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

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
