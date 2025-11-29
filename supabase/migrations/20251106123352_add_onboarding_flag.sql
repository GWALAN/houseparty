/*
  # Add Onboarding Flag

  1. Changes
    - Add `has_completed_onboarding` column to user_profile_settings table
    - Default value is false for new users
    - Existing users will be marked as completed (true)
  
  2. Purpose
    - Track whether users have completed the onboarding flow
    - Show onboarding to new users only
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'has_completed_onboarding'
  ) THEN
    ALTER TABLE user_profile_settings ADD COLUMN has_completed_onboarding boolean DEFAULT false;
    
    -- Mark existing users as having completed onboarding
    UPDATE user_profile_settings SET has_completed_onboarding = true WHERE created_at < NOW();
  END IF;
END $$;
