/*
  # Add DELETE Policy for Friendships

  1. Security Changes
    - Add RLS DELETE policy for friendships table
    - Users can delete their own friendship records
    - Required for friend removal functionality

  2. Policy Details
    - Policy: "Users can delete their own friendships"
    - Applies to: DELETE operations on friendships table
    - Condition: The user_id matches the authenticated user
    - Purpose: Allow users to remove friends from their friend list
*/

-- Add DELETE policy for friendships
CREATE POLICY "Users can delete their own friendships"
  ON friendships
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Also add INSERT policy if it doesn't exist (needed for accepting friend requests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'friendships' 
    AND policyname = 'Users can create friendships'
  ) THEN
    CREATE POLICY "Users can create friendships"
      ON friendships
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
