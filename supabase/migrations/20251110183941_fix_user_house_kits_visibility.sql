/*
  # Fix user_house_kits visibility for friend profiles

  1. Changes
    - Update RLS policy on user_house_kits to allow viewing kits for non-private profiles
    - Users can view their own kits
    - Users can view kits of users with public profiles
    - Respects is_private setting from user_profile_settings

  2. Security
    - Maintains privacy controls
    - Only allows viewing, not modifying other users' kits
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own kits" ON user_house_kits;

-- Create new policy that allows viewing public profiles' kits
CREATE POLICY "Users can view kits based on privacy settings"
  ON user_house_kits FOR SELECT
  TO authenticated
  USING (
    -- User can view their own kits
    auth.uid() = user_id
    OR
    -- User can view kits of profiles that are not private
    EXISTS (
      SELECT 1 FROM user_profile_settings
      WHERE user_profile_settings.user_id = user_house_kits.user_id
      AND (user_profile_settings.is_private = false OR user_profile_settings.is_private IS NULL)
    )
  );
