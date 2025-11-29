/*
  # Add Missing Columns to house_customizations

  1. Changes
    - Add `applied_kit_id` column (uuid) - reference to the applied house kit
    - Add `custom_banner_colors` column (jsonb) - stores the color scheme
    - Add `rarity` column (text) - stores the kit rarity
    
  2. Notes
    - These columns are needed by the frontend queries
    - The `applied_kit_id` is the primary reference to the house kit
    - Other columns store denormalized data for performance
*/

-- Add applied_kit_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'applied_kit_id'
  ) THEN
    ALTER TABLE house_customizations 
    ADD COLUMN applied_kit_id uuid REFERENCES house_kits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add custom_banner_colors if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'custom_banner_colors'
  ) THEN
    ALTER TABLE house_customizations 
    ADD COLUMN custom_banner_colors jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add rarity if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'rarity'
  ) THEN
    ALTER TABLE house_customizations 
    ADD COLUMN rarity text;
  END IF;
END $$;

-- Sync equipped_house_kit_id with applied_kit_id if needed
UPDATE house_customizations
SET applied_kit_id = equipped_house_kit_id
WHERE equipped_house_kit_id IS NOT NULL AND applied_kit_id IS NULL;

-- Sync custom_banner_colors with kit_color_scheme if needed
UPDATE house_customizations
SET custom_banner_colors = kit_color_scheme
WHERE kit_color_scheme IS NOT NULL AND custom_banner_colors = '[]'::jsonb;

-- Sync rarity with kit_rarity if needed
UPDATE house_customizations
SET rarity = kit_rarity
WHERE kit_rarity IS NOT NULL AND rarity IS NULL;