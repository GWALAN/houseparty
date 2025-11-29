/*
  # Add Push Notifications Support

  ## Changes
  1. Add push_token column to user_profile_settings for storing device push tokens
  2. Add push_enabled column to control push notifications

  ## Purpose
  Enable real-time push notifications for:
  - Friend requests
  - Friend request acceptances
  - Game invitations
*/

-- Add push token column to user profile settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings'
    AND column_name = 'push_token'
  ) THEN
    ALTER TABLE user_profile_settings
    ADD COLUMN push_token text;
  END IF;
END $$;

-- Add push enabled flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profile_settings'
    AND column_name = 'push_enabled'
  ) THEN
    ALTER TABLE user_profile_settings
    ADD COLUMN push_enabled boolean DEFAULT true;
  END IF;
END $$;