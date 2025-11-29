/*
  # Remove duplicate policy on user_house_kits

  1. Changes
    - Remove the old restrictive "Users can view own house kits" policy
    - Keep the new "Authenticated users can view all kits" policy

  2. Security
    - Maintains proper access control through the new policy
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own house kits" ON user_house_kits;
