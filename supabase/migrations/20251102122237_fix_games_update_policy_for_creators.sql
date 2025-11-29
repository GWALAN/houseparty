/*
  # Fix Games Update Policy
  
  1. Changes
    - Drop existing restrictive update policy
    - Create new policy allowing both house creators and admins to update games
    
  2. Security
    - Allows house creators to manage all games in their houses
    - Allows house admins to manage games in houses they administer
*/

DROP POLICY IF EXISTS "House admins can update games" ON games;

CREATE POLICY "House creators and admins can update games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM houses
      WHERE houses.id = games.house_id
      AND houses.creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );