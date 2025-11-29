/*
  # Fix House Members Self-Delete Policy

  ## Problem
  Users cannot leave houses because the DELETE policy only allows admins to remove members.
  Regular members need to be able to remove themselves (leave the house).

  ## Changes
  1. Drop the existing restrictive DELETE policy
  2. Create a new DELETE policy that allows:
     - Admins to remove any member from their house
     - Any member to remove themselves (leave the house)

  ## Security
  - Users can only delete their own membership record
  - Admins can delete any member from houses they admin
*/

-- Drop the existing restrictive DELETE policy
DROP POLICY IF EXISTS "Members can be removed by admins" ON house_members;
DROP POLICY IF EXISTS "House admins can remove members" ON house_members;
DROP POLICY IF EXISTS "Admins can remove members from their houses" ON house_members;

-- Create new DELETE policy that allows self-removal and admin removal
CREATE POLICY "Members can leave house or admins can remove members"
  ON house_members FOR DELETE
  TO authenticated
  USING (
    -- Allow user to delete their own membership (leave house)
    user_id = auth.uid()
    OR
    -- Allow admins to remove any member from their house
    EXISTS (
      SELECT 1 FROM house_members hm
      WHERE hm.house_id = house_members.house_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );