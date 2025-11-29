/*
  # Fix user_house_kits visibility for friend profiles

  1. Changes
    - Update RLS policy on user_house_kits to allow viewing all users' kits
    - Users can view their own kits
    - Users can view other authenticated users' kits (profiles are public by default)

  2. Security
    - Only allows viewing, not modifying other users' kits
    - Maintains authentication requirement
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own kits" ON user_house_kits;

-- Create new policy that allows viewing all kits for authenticated users
CREATE POLICY "Authenticated users can view all kits"
  ON user_house_kits FOR SELECT
  TO authenticated
  USING (true);
