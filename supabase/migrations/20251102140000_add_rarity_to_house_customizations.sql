/*
  # Add rarity to house customizations

  1. Changes
    - Add kit_rarity column to store the rarity of applied kits
    - This enables proper rendering of kit animations and effects

  2. Security
    - Maintains existing RLS policies
*/

-- Add kit_rarity column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'kit_rarity'
  ) THEN
    ALTER TABLE house_customizations
    ADD COLUMN kit_rarity text;
  END IF;
END $$;

-- Add kit_color_scheme column to cache colors for faster lookups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'kit_color_scheme'
  ) THEN
    ALTER TABLE house_customizations
    ADD COLUMN kit_color_scheme jsonb;
  END IF;
END $$;
