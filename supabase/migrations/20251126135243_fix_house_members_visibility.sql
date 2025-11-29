/*
  # Fix House Members Visibility

  ## Changes
  - Drop the restrictive "Users can view their own memberships" policy
  - Add new policy that allows house members to view all members of houses they belong to

  ## Security
  - Users can only see members of houses they are part of
  - Maintains data privacy while enabling proper house member lists
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.house_members;

-- Add new policy allowing house members to see all members of their houses
CREATE POLICY "House members can view all members of their houses"
  ON public.house_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.house_members hm 
      WHERE hm.house_id = house_members.house_id 
      AND hm.user_id = auth.uid()
    )
  );
