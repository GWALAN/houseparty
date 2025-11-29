/*
  # Add Placement Column to Session Scores
  
  1. Changes
    - Add `placement` column to session_scores table
    - This column stores the final ranking/position of players in a game session
    - Values: 1 (first place), 2 (second place), 3 (third place), etc.
    - Nullable to support existing records without placement data
  
  2. Purpose
    - Enables proper game result tracking with player rankings
    - Required for determining winner/loser positions
    - Used by leaderboard and stats calculations
  
  3. Security
    - No RLS changes needed
    - Existing update policies allow session creators to set placement values
*/

-- Add placement column to session_scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'session_scores' AND column_name = 'placement'
  ) THEN
    ALTER TABLE session_scores ADD COLUMN placement integer;
  END IF;
END $$;
