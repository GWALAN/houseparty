/*
  # Add House Delete Policy

  1. Changes
    - Add DELETE policy for houses table
    - Allow house creators and admins to delete houses
    
  2. Security
    - Only authenticated users can delete
    - Must be either the house creator OR a house admin
    - Uses EXISTS check on house_members for admin verification
    
  3. Purpose
    - Enable house deletion functionality in the app
    - Maintain proper authorization controls
*/

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Creators and admins can delete houses" ON houses;

-- Create delete policy for houses
CREATE POLICY "Creators and admins can delete houses"
  ON houses FOR DELETE
  TO authenticated
  USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = houses.id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );