/*
  # Fix Infinite Recursion in house_members RLS Policy

  ## Problem
  The policy "Users can view members of their houses" causes infinite recursion:
  - To check if user can SELECT from house_members
  - The policy queries house_members (SELECT house_id FROM house_members WHERE user_id = auth.uid())
  - Which triggers the RLS check again
  - Infinite loop!

  ## Solution
  Drop the recursive policy. The existing policy "Users can view their own memberships" 
  is sufficient for the home screen query which uses `.eq('user_id', user.id)`.
  
  For viewing OTHER members (like in admin screens), we'll rely on the app-level 
  queries that join through houses.

  ## Changes
  - Drop the problematic recursive policy
  - Keep the simple, non-recursive policy for viewing own memberships
*/

DROP POLICY IF EXISTS "Users can view members of their houses" ON house_members;
