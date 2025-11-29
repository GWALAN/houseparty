/*
  # Fix Leaderboard Function - Player Streaks Issue

  1. Problem
    - Leaderboard function references `player_streaks` table which doesn't exist
    - This causes leaderboard to fail with "relation player_streaks does not exist"

  2. Solution
    - Create `player_streaks` table if it doesn't exist
    - Add proper indexes and RLS policies
    - This allows leaderboard to display streak data

  3. Tables Created
    - `player_streaks` - Tracks win/loss streaks per player per house
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `house_id` (uuid, foreign key to houses)
      - `streak_type` (text: 'win' or 'loss')
      - `current_streak` (integer)
      - `best_streak` (integer)
      - `last_updated` (timestamptz)
      - `created_at` (timestamptz)

  4. Security
    - Enable RLS
    - Users can read their own streaks
    - Users can read streaks of house members
*/

-- Create player_streaks table if it doesn't exist
CREATE TABLE IF NOT EXISTS player_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  streak_type text NOT NULL CHECK (streak_type IN ('win', 'loss')),
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, house_id, streak_type)
);

-- Enable RLS on player_streaks
ALTER TABLE player_streaks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own streaks" ON player_streaks;
DROP POLICY IF EXISTS "Users can read house member streaks" ON player_streaks;
DROP POLICY IF EXISTS "System can insert streaks" ON player_streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON player_streaks;

-- Policy: Users can read their own streaks
CREATE POLICY "Users can read own streaks"
  ON player_streaks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can read streaks of house members
CREATE POLICY "Users can read house member streaks"
  ON player_streaks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = player_streaks.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Policy: Users can insert their own streaks
CREATE POLICY "Users can insert own streaks"
  ON player_streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own streaks
CREATE POLICY "Users can update own streaks"
  ON player_streaks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_streaks_user_house
  ON player_streaks(user_id, house_id);

CREATE INDEX IF NOT EXISTS idx_player_streaks_house
  ON player_streaks(house_id);

CREATE INDEX IF NOT EXISTS idx_player_streaks_streak_type
  ON player_streaks(house_id, streak_type);
