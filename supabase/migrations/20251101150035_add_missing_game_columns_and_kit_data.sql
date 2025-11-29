/*
  # Add Missing Columns and Sample Kit Data
  
  ## Changes Made
  
  1. Games Table
    - Add `created_by` column (uuid, foreign key to auth.users)
    - Add `rules` column (jsonb for storing game rules)
  
  2. User Kit Catalog
    - Insert sample house kits for users to view and purchase
  
  ## Security
  
  - RLS policies already exist for these tables
*/

-- Add missing columns to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE games ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'rules'
  ) THEN
    ALTER TABLE games ADD COLUMN rules jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Insert sample house kits into user_kit_catalog
INSERT INTO user_kit_catalog (name, description, rarity, is_unlockable, is_earnable, is_active, unlock_type, price_cents, unlock_chance, owned_by_user)
VALUES
  ('Classic House Kit', 'Traditional house vibes with warm colors and cozy aesthetics', 'free', true, false, true, 'free', 0, 0, true),
  ('Neon Nights', 'Bright neon colors perfect for party houses', 'common', true, false, true, 'purchasable', 299, 0, false),
  ('Ocean Breeze', 'Cool blues and aqua tones for a refreshing look', 'common', true, false, true, 'purchasable', 299, 0, false),
  ('Sunset Glow', 'Warm oranges and pinks for sunset vibes', 'uncommon', true, false, true, 'purchasable', 499, 0, false),
  ('Forest Grove', 'Natural greens and earth tones', 'uncommon', true, false, true, 'purchasable', 499, 0, false),
  ('Royal Purple', 'Luxurious purple and gold accents', 'rare', true, false, true, 'purchasable', 799, 0, false),
  ('Cyberpunk', 'Futuristic neon pinks and electric blues', 'rare', true, false, true, 'purchasable', 799, 0, false),
  ('Galaxy', 'Deep space purples with star effects', 'epic', true, false, true, 'purchasable', 1299, 0, false),
  ('Dragon Fire', 'Intense reds and oranges with flame effects', 'epic', true, false, true, 'purchasable', 1299, 0, false),
  ('Diamond Ice', 'Pristine whites and light blues with sparkle effects', 'legendary', true, false, true, 'purchasable', 1999, 0, false),
  ('Golden Hour', 'Warm golds and sunset colors with premium effects', 'legendary', true, true, true, 'chance_based', 0, 0.05, false),
  ('Aurora Borealis', 'Dancing greens and blues like northern lights', 'mythic', true, true, true, 'chance_based', 0, 0.01, false)
ON CONFLICT DO NOTHING;
