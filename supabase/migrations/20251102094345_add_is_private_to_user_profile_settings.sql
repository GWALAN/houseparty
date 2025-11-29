/*
  # Add Privacy Setting to User Profile Settings

  1. Changes
    - Add is_private column to user_profile_settings table
    - Defaults to false (public profile)
    - Allows users to hide their stats from non-friends

  2. Security
    - No RLS changes needed as user_profile_settings already has proper policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE user_profile_settings
    ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;
