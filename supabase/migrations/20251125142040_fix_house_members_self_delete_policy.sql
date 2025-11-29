/*
  # Fix House Member Self-Delete Policy

  1. Changes
    - Add RLS policy to allow users to delete themselves from house_members
    - Users can leave houses they are members of by deleting their own record
    - Admins can still delete other members via existing policy

  2. Security
    - Users can only delete their own house_member record (user_id = auth.uid())
    - Cannot delete other users' memberships
*/

-- Allow users to delete themselves from houses (leave house)
CREATE POLICY "Users can delete themselves from houses"
  ON house_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
