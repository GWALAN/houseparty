/*
  # Add deleted_by Column to Games Table

  1. Changes
    - Add `deleted_by` (uuid, nullable) column to games table
    - References auth.users(id) with ON DELETE SET NULL
    
  2. Purpose
    - Track which user deleted a game
    - Required by house-settings screen delete game functionality
    
  3. Security
    - No RLS changes needed
*/

-- Add deleted_by column to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE games ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;
  END IF;
END $$;