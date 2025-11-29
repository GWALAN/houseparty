/*
  # Add House Kit Reference to User Profiles

  1. Changes
    - Add `equipped_house_kit_id` column to `user_profile_settings` table
    - This allows users to equip a house kit to their profile for visual customization
    - The kit will be used to style their profile header, stats cards, and player card
  
  2. Security
    - Foreign key constraint ensures only valid house kits can be equipped
    - Users can equip any house kit (they don't need to own it first)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'equipped_house_kit_id'
  ) THEN
    ALTER TABLE user_profile_settings 
    ADD COLUMN equipped_house_kit_id uuid REFERENCES house_kits(id) ON DELETE SET NULL;
  END IF;
END $$;
