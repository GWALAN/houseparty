/*
  # Add DELETE policy for houses table

  1. Security Changes
    - Add DELETE policy allowing house creators and admins to delete houses
    - Policy checks:
      - User is the creator (creator_id = auth.uid()), OR
      - User is an admin of the house
  
  2. Purpose
    - Enables house creators and admins to delete houses
    - Maintains security by restricting deletion to authorized users only
*/

-- Policy: House creators and admins can delete houses
CREATE POLICY "House creators and admins can delete houses"
  ON houses
  FOR DELETE
  TO authenticated
  USING (
    creator_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 
      FROM house_members
      WHERE house_members.house_id = houses.id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );