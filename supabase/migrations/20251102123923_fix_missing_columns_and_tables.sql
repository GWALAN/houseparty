/*
  # Fix Missing Database Columns and Tables

  1. Changes to Existing Tables
    - Add `emoji` column to `games` table for game icons
  
  2. New Tables
    - `player_streaks` - Track player win/loss streaks
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `house_id` (uuid, references houses)
      - `streak_type` (text: 'win' or 'loss')
      - `current_streak` (integer)
      - `best_streak` (integer)
      - `last_updated` (timestamp)
  
  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users to read streak data
    - Add policies for system to update streak data
*/

-- Add emoji column to games table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'emoji'
  ) THEN
    ALTER TABLE games ADD COLUMN emoji text;
  END IF;
END $$;

-- Create player_streaks table
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

-- Policy: System can insert streaks
CREATE POLICY "System can insert streaks"
  ON player_streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: System can update streaks
CREATE POLICY "Users can update own streaks"
  ON player_streaks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_streaks_user_house 
  ON player_streaks(user_id, house_id);

CREATE INDEX IF NOT EXISTS idx_player_streaks_house 
  ON player_streaks(house_id);
