/*
  # Fix House Kits RLS to Allow User-Owned Kits

  1. Changes
    - Update house_kits RLS policy to allow users to view kits they own
    - Current policy only allows viewing "is_active = true" kits
    - Users should see all kits they've unlocked in their collection

  2. Security
    - Users can view kits they own through user_house_kits table
    - Maintains security by requiring ownership verification
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active house kits" ON house_kits;

-- Create new policy allowing users to view kits they own
CREATE POLICY "Users can view kits they own"
  ON house_kits FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT house_kit_id 
      FROM user_house_kits 
      WHERE user_id = auth.uid()
    )
  );

-- Also allow viewing all active kits (for shop browsing)
CREATE POLICY "Anyone can view active house kits"
  ON house_kits FOR SELECT
  TO authenticated
  USING (is_active = true);