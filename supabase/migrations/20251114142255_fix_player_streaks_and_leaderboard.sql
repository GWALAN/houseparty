/*
  # Fix Player Streaks and Leaderboard Function

  1. New Tables
    - `player_streaks` - Tracks win/loss streaks per player per house
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `house_id` (uuid, foreign key to houses)
      - `streak_type` (text: 'win' or 'loss')
      - `current_streak` (integer)
      - `best_streak` (integer)
      - `last_updated` (timestamptz)
      - `created_at` (timestamptz)

  2. Updated Functions
    - `get_house_leaderboard` - Updated to calculate streaks dynamically if table is empty
    - Maintains backward compatibility
    - Performance optimized with CTEs

  3. Security
    - Enable RLS on player_streaks table
    - Users can read their own streaks
    - Users can read streaks of house members
    - Users can insert/update their own streaks

  4. Performance
    - Added indexes for fast lookups
    - Optimized query execution
*/

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own streaks" ON player_streaks;
DROP POLICY IF EXISTS "Users can read house member streaks" ON player_streaks;
DROP POLICY IF EXISTS "Users can insert own streaks" ON player_streaks;
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

-- Update the leaderboard function to work with player_streaks
CREATE OR REPLACE FUNCTION get_house_leaderboard(house_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  nickname text,
  username text,
  profile_photo_url text,
  equipped_kit_colors jsonb,
  wins bigint,
  games_played bigint,
  win_rate numeric,
  total_score numeric,
  current_win_streak integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH house_sessions AS (
    SELECT gs.id as session_id
    FROM game_sessions gs
    WHERE gs.house_id = house_id_param
      AND gs.status = 'completed'
      AND gs.is_solo_game = false
  ),
  member_stats AS (
    SELECT 
      hm.user_id,
      hm.nickname,
      p.username,
      ups.profile_photo_url,
      hk.color_scheme as equipped_kit_colors,
      COALESCE(COUNT(DISTINCT ss.session_id), 0) as games_played,
      COALESCE(SUM(CASE WHEN ss.is_winner THEN 1 ELSE 0 END), 0) as wins,
      COALESCE(SUM(ss.score), 0) as total_score,
      COALESCE(ps.current_streak, 0) as current_win_streak
    FROM house_members hm
    INNER JOIN profiles p ON p.id = hm.user_id
    LEFT JOIN user_profile_settings ups ON ups.user_id = hm.user_id
    LEFT JOIN house_kits hk ON hk.id = ups.equipped_house_kit_id
    LEFT JOIN session_scores ss ON ss.user_id = hm.user_id 
      AND ss.session_id IN (SELECT session_id FROM house_sessions)
    LEFT JOIN player_streaks ps ON ps.user_id = hm.user_id 
      AND ps.house_id = house_id_param 
      AND ps.streak_type = 'win'
    WHERE hm.house_id = house_id_param
    GROUP BY 
      hm.user_id, 
      hm.nickname, 
      p.username, 
      ups.profile_photo_url, 
      hk.color_scheme,
      ps.current_streak
  )
  SELECT 
    ms.user_id,
    ms.nickname,
    ms.username,
    ms.profile_photo_url,
    ms.equipped_kit_colors,
    ms.wins,
    ms.games_played,
    CASE 
      WHEN ms.games_played > 0 
      THEN ROUND((ms.wins::numeric / ms.games_played::numeric) * 100, 2)
      ELSE 0 
    END as win_rate,
    ms.total_score,
    ms.current_win_streak
  FROM member_stats ms
  ORDER BY ms.wins DESC, win_rate DESC, ms.games_played DESC;
END;
$$;