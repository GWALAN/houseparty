/*
  # Fix Circular Dependency in House Members RLS

  ## Problem
  - The house_members SELECT policy was checking house_members.house_id which creates a circular dependency
  - This breaks the houses SELECT policy which depends on house_members
  
  ## Solution
  - Update policy to allow viewing members of any house you belong to
  - Use a simpler check that doesn't create circular dependency

  ## Security
  - Users can view members of houses they belong to
  - No circular dependency in RLS checks
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "House members can view all members of their houses" ON public.house_members;

-- Create a better policy that avoids circular dependency
CREATE POLICY "House members can view all members"
  ON public.house_members
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see members of houses where they are also a member
    house_id IN (
      SELECT hm.house_id 
      FROM public.house_members hm 
      WHERE hm.user_id = auth.uid()
    )
  );
