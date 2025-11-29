/*
  # Fix User Profile Settings Missing Columns

  1. Changes
    - Add `has_completed_onboarding` column to `user_profile_settings` (tracks if user finished onboarding)
    - Add `equipped_house_kit_id` column to `user_profile_settings` with foreign key to `house_kits`
    - Set sensible defaults for existing users
    
  2. Notes
    - `has_completed_onboarding` defaults to `false` for new users
    - `equipped_house_kit_id` is nullable to allow users without equipped kits
    - Existing users will have `has_completed_onboarding` set to `true` (since they're already using the app)
*/

-- Add has_completed_onboarding column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'has_completed_onboarding'
  ) THEN
    ALTER TABLE user_profile_settings 
    ADD COLUMN has_completed_onboarding boolean DEFAULT false;
    
    -- Set to true for existing users who are already using the app
    UPDATE user_profile_settings SET has_completed_onboarding = true;
  END IF;
END $$;

-- Add equipped_house_kit_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'equipped_house_kit_id'
  ) THEN
    ALTER TABLE user_profile_settings 
    ADD COLUMN equipped_house_kit_id uuid REFERENCES house_kits(id) ON DELETE SET NULL;
    
    -- Create index for better query performance
    CREATE INDEX IF NOT EXISTS idx_user_profile_settings_equipped_house_kit 
    ON user_profile_settings(equipped_house_kit_id);
  END IF;
END $$;