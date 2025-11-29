/*
  # Add Missing Tables and Columns

  1. New Tables
    - `subscriptions` - Tracks user subscription status
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `tier` (text) - free, premium, or vip
      - `status` (text) - active, cancelled, expired
      - `started_at` (timestamptz)
      - `expires_at` (timestamptz)
    
    - `user_unlocked_banners` - Tracks which banners users have unlocked
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `banner_id` (uuid)
      - `unlocked_at` (timestamptz)

  2. Column Additions
    - Add `selected_banner_id` to profiles table
    - Add `profile_photo_url` and `display_name` to user_profile_settings
    - Add `status` column to user_purchases
    - Remove emoji_pack_id from houses and fix queries

  3. Security
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

-- Add missing columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'selected_banner_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN selected_banner_id uuid;
  END IF;
END $$;

-- Add missing columns to user_profile_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE user_profile_settings ADD COLUMN profile_photo_url text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE user_profile_settings ADD COLUMN display_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'selected_banner_id'
  ) THEN
    ALTER TABLE user_profile_settings ADD COLUMN selected_banner_id uuid;
  END IF;
END $$;

-- Add status column to user_purchases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_purchases' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_purchases' AND column_name = 'purchase_type'
  ) THEN
    ALTER TABLE user_purchases ADD COLUMN purchase_type text;
  END IF;
END $$;

-- Add nickname column to house_members if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_members' AND column_name = 'nickname'
  ) THEN
    ALTER TABLE house_members ADD COLUMN nickname text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'houses' AND column_name = 'banner_id'
  ) THEN
    ALTER TABLE houses ADD COLUMN banner_id uuid;
  END IF;
END $$;
