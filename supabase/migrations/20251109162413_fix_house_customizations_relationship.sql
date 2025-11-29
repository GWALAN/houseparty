/*
  # Fix House Customizations to House Kits Relationship

  1. Changes
    - Ensure `applied_kit_id` column exists in `house_customizations`
    - Add foreign key constraint to `house_kits` table if missing
    - Create index for better query performance
    
  2. Notes
    - This fixes the relationship errors between house customizations and kits
    - Allows proper tracking of which kit is applied to each house
*/

-- Add applied_kit_id column if it doesn't exist
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

-- Ensure foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'house_customizations_applied_kit_id_fkey'
    AND table_name = 'house_customizations'
  ) THEN
    ALTER TABLE house_customizations
    ADD CONSTRAINT house_customizations_applied_kit_id_fkey
    FOREIGN KEY (applied_kit_id) REFERENCES house_kits(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_house_customizations_applied_kit 
ON house_customizations(applied_kit_id);