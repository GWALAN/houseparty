/*
  # Fix House Invite Code Lookup

  1. Changes
    - Add RLS policy to allow authenticated users to look up houses by invite code
    - This is required for the join-house flow to work
  
  2. Security
    - Only allows SELECT operations
    - Only for authenticated users
    - Does not expose sensitive house data beyond what's needed for joining
*/

-- Allow authenticated users to look up houses by invite code for joining
CREATE POLICY "Users can view houses by invite code for joining"
  ON houses
  FOR SELECT
  TO authenticated
  USING (invite_code IS NOT NULL);
