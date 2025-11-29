/*
  # Update House Customizations for Kit Application
  
  1. Changes
    - Add equipped_house_kit_id column to house_customizations table
    - This stores which kit is applied to each house
    - Create index for faster lookups
  
  2. Security
    - Maintains existing RLS policies
    - Only house admins can update house customizations
*/

-- Add equipped_house_kit_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'house_customizations' AND column_name = 'equipped_house_kit_id'
  ) THEN
    ALTER TABLE house_customizations 
    ADD COLUMN equipped_house_kit_id uuid REFERENCES house_kits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_house_customizations_equipped_kit 
ON house_customizations(equipped_house_kit_id);

-- Create index for house_id lookups
CREATE INDEX IF NOT EXISTS idx_house_customizations_house_id 
ON house_customizations(house_id);