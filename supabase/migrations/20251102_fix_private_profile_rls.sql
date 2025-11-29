/*
  # Fix Private Profile Security

  1. Changes
    - Add RLS policy to protect private profiles from unauthorized access
    - Ensure user_profile_settings can only be viewed by:
      - The profile owner themselves
      - Friends of non-private profiles
      - Public profiles (is_profile_private = false)

  2. Security
    - Prevents unauthorized access to private profile settings
    - Maintains data privacy for users who mark profiles as private
*/

-- Add RLS policy to protect private profile settings
CREATE POLICY "Users can view own profile settings"
  ON user_profile_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public profile settings"
  ON user_profile_settings FOR SELECT
  TO authenticated
  USING (
    is_profile_private = false
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE friendships.user_id = auth.uid()
      AND friendships.friend_id = user_profile_settings.user_id
    )
  );
