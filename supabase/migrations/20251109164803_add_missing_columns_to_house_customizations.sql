/*
  # Add Missing Columns to house_customizations

  1. Changes
    - Add `custom_banner_colors` column (jsonb) - stores the color scheme
    - Add `rarity` column (text) - stores the kit rarity
    - Add `equipped_house_kit_id` column (uuid) - reference to equipped kit (legacy support)
    - Add `kit_rarity` column (text) - legacy column name
    - Add `kit_color_scheme` column (jsonb) - legacy column name
    
  2. Notes
    - These columns are needed by the frontend queries
    - Some columns are duplicates for backward compatibility
    - The `applied_kit_id` already exists and is the primary reference
*/

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

-- Add equipped_house_kit_id if it doesn't exist (legacy support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'equipped_house_kit_id'
  ) THEN
    ALTER TABLE house_customizations 
    ADD COLUMN equipped_house_kit_id uuid REFERENCES house_kits(id) ON DELETE SET NULL;
    
    -- Copy data from applied_kit_id to equipped_house_kit_id for consistency
    UPDATE house_customizations
    SET equipped_house_kit_id = applied_kit_id
    WHERE applied_kit_id IS NOT NULL;
  END IF;
END $$;

-- Add kit_rarity as alias for rarity (legacy support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'kit_rarity'
  ) THEN
    ALTER TABLE house_customizations 
    ADD COLUMN kit_rarity text;
    
    -- Copy data from rarity
    UPDATE house_customizations
    SET kit_rarity = rarity
    WHERE rarity IS NOT NULL;
  END IF;
END $$;

-- Add kit_color_scheme as alias for custom_banner_colors (legacy support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'kit_color_scheme'
  ) THEN
    ALTER TABLE house_customizations 
    ADD COLUMN kit_color_scheme jsonb DEFAULT '[]'::jsonb;
    
    -- Copy data from custom_banner_colors
    UPDATE house_customizations
    SET kit_color_scheme = custom_banner_colors
    WHERE custom_banner_colors IS NOT NULL;
  END IF;
END $$;