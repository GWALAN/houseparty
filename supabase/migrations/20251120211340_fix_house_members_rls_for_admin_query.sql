/*
  # Fix house_members RLS for Admin House Query

  ## Problem
  The current RLS policy only allows users to see their own memberships:
  `auth.uid() = user_id`
  
  This blocks the KitApplicationModal query which needs to:
  1. Join house_members with houses using `houses!inner`
  2. Filter by `.eq('role', 'admin')`
  
  The query fails in production APK because RLS strictly enforces viewing only your own rows.

  ## Solution
  Add a new SELECT policy that allows users to view house_members records for houses they belong to.
  This enables the admin role filter to work while maintaining security.

  ## Changes
  - Add policy "Users can view members of their houses" to allow viewing house_members for houses the user belongs to
  - Keep existing policy for viewing own memberships
*/

-- Drop any existing overlapping policies
DROP POLICY IF EXISTS "Users can view members of their houses" ON house_members;

-- Create policy to allow users to see all members of houses they belong to
CREATE POLICY "Users can view members of their houses"
  ON house_members
  FOR SELECT
  TO authenticated
  USING (
    house_id IN (
      SELECT house_id 
      FROM house_members 
      WHERE user_id = auth.uid()
    )
  );
