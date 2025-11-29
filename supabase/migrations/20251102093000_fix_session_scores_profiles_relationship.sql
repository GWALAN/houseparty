/*
  # Fix Session Scores and Profiles Relationship

  1. Changes
    - Add foreign key constraint from session_scores.user_id to profiles.id
    - This allows Supabase to join session_scores with profiles table in queries
    - The relationship is needed for leaderboard queries to fetch usernames

  2. Important Notes
    - Uses IF NOT EXISTS to prevent errors if constraint already exists
    - ON DELETE CASCADE ensures orphaned scores are cleaned up if a profile is deleted
*/

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'session_scores_user_id_fkey_profiles'
    AND table_name = 'session_scores'
  ) THEN
    ALTER TABLE session_scores
    ADD CONSTRAINT session_scores_user_id_fkey_profiles
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;
