/*
  # Fix user_equipped_kits Foreign Key with Data Cleanup
  
  1. Changes
    - Delete any equipped kit records that reference non-existent house_kits
    - Drop the old foreign key constraint pointing to user_kit_catalog
    - Add new foreign key constraint pointing to house_kits
  
  2. Security
    - Maintains all existing RLS policies
    - Cleans up invalid data before adding constraint
*/

-- First, delete any equipped kit records that don't have a matching house_kit
DELETE FROM user_equipped_kits
WHERE kit_id NOT IN (SELECT id FROM house_kits);

-- Drop the old foreign key constraint
ALTER TABLE user_equipped_kits 
DROP CONSTRAINT IF EXISTS user_equipped_kits_kit_id_fkey;

-- Add new foreign key constraint pointing to house_kits
ALTER TABLE user_equipped_kits 
ADD CONSTRAINT user_equipped_kits_kit_id_fkey 
FOREIGN KEY (kit_id) 
REFERENCES house_kits(id) 
ON DELETE SET NULL;