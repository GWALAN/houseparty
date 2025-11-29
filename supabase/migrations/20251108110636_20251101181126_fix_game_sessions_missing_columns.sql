/*
  # Fix game_sessions table - Add missing columns

  1. Changes
    - Add `created_by` column to track who created the game session
    - Add `status` column to track game state (active, completed, cancelled)
    - Add `ended_at` column to track when game was completed
    
  2. Security
    - No RLS changes needed as table already has RLS enabled
*/

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'status'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'));
  END IF;
END $$;

-- Add ended_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_sessions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE game_sessions ADD COLUMN ended_at timestamptz;
  END IF;
END $$;