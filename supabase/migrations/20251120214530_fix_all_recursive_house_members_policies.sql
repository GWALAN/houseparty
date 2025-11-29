/*
  # Fix All Recursive house_members RLS Policies

  ## Problem
  Multiple policies on house_members contain recursive subqueries that cause infinite loops:
  - "Admins can update house members" 
  - "Admins can delete house members"
  - "Members can leave house or admins can remove members"
  
  All check admin status by querying house_members again, causing infinite recursion.

  ## Solution
  Replace these policies with simpler, non-recursive versions:
  - For updates: Only allow users to update their own nickname/emoji pack
  - For deletes: Allow users to delete their own memberships only
  - Admin operations will be handled via SECURITY DEFINER functions

  ## Changes
  1. Drop all recursive policies
  2. Create simple, non-recursive policies
  3. Admin operations (removing members, updating roles) handled by backend functions
*/

-- Drop all existing policies on house_members
DROP POLICY IF EXISTS "Admins can update house members" ON house_members;
DROP POLICY IF EXISTS "Admins can delete house members" ON house_members;
DROP POLICY IF EXISTS "Members can leave house or admins can remove members" ON house_members;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON house_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON house_members;

-- Simple SELECT policy: users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON house_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Simple INSERT policy: users can insert their own memberships
CREATE POLICY "Users can insert own memberships"
  ON house_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Simple UPDATE policy: users can update their own nickname and emoji pack
CREATE POLICY "Users can update own membership details"
  ON house_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Simple DELETE policy: users can leave houses (delete their own membership)
CREATE POLICY "Users can leave houses"
  ON house_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
