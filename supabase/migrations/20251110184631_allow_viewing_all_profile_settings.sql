/*
  # Allow viewing all user profile settings

  1. Changes
    - Update RLS policy on user_profile_settings to allow viewing all users' settings
    - Users can view anyone's profile settings (equipped kit, display name, etc.)
    - Only the owner can update their own settings

  2. Security
    - Profile settings are considered public information
    - Only viewing is allowed for others
    - Updates still restricted to owner
*/

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own profile settings" ON user_profile_settings;

-- Create new policy that allows viewing all profile settings
CREATE POLICY "Authenticated users can view all profile settings"
  ON user_profile_settings FOR SELECT
  TO authenticated
  USING (true);
