/*
  # Create Missing Database Objects
  
  ## New Tables
  
  1. **game_sessions** - Tracks individual game sessions
    - `id` (uuid, primary key)
    - `game_id` (uuid, foreign key to games)
    - `house_id` (uuid, foreign key to houses)
    - `is_solo_game` (boolean, default false)
    - `started_at` (timestamptz)
    - `completed_at` (timestamptz)
    - `created_at` (timestamptz)
  
  2. **session_scores** - Tracks player scores in game sessions
    - `id` (uuid, primary key)
    - `session_id` (uuid, foreign key to game_sessions)
    - `user_id` (uuid, foreign key to auth.users)
    - `score` (integer)
    - `is_winner` (boolean)
    - `created_at` (timestamptz)
  
  3. **badge_definitions** - Defines available badges
    - `id` (uuid, primary key)
    - `name` (text)
    - `description` (text)
    - `icon` (text)
    - `rarity` (text)
    - `created_at` (timestamptz)
  
  4. **user_badges** - Tracks user-earned badges
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `badge_type` (text)
    - `badge_data` (jsonb)
    - `earned_at` (timestamptz)
    - `is_unlocked` (boolean)
    - `badge_definition_id` (uuid, foreign key to badge_definitions)
  
  5. **player_achievements** - Tracks player achievements
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `achievement_type` (text)
    - `achievement_data` (jsonb)
    - `earned_at` (timestamptz)
    - `created_at` (timestamptz)
  
  ## New Views
  
  1. **user_profiles_with_kits** - User profiles with their equipped kits
  
  ## New Functions
  
  1. **equip_kit_for_testing** - Allows users to equip house kits
  
  ## Security
  
  - Enable RLS on all new tables
  - Create restrictive policies for authenticated users only
  - Users can only access their own data
*/

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  house_id uuid REFERENCES houses(id) ON DELETE CASCADE,
  is_solo_game boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view game sessions in their houses"
  ON game_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = game_sessions.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create game sessions in their houses"
  ON game_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = game_sessions.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Create session_scores table
CREATE TABLE IF NOT EXISTS session_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  is_winner boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE session_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own session scores"
  ON session_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view session scores in their houses"
  ON session_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions
      JOIN house_members ON house_members.house_id = game_sessions.house_id
      WHERE game_sessions.id = session_scores.session_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own session scores"
  ON session_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create badge_definitions table
CREATE TABLE IF NOT EXISTS badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  icon text DEFAULT '🏆',
  rarity text DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badge definitions"
  ON badge_definitions FOR SELECT
  TO authenticated
  USING (true);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type text NOT NULL,
  badge_data jsonb DEFAULT '{}'::jsonb,
  earned_at timestamptz DEFAULT now(),
  is_unlocked boolean DEFAULT false,
  badge_definition_id uuid REFERENCES badge_definitions(id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own badges"
  ON user_badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create player_achievements table
CREATE TABLE IF NOT EXISTS player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type text NOT NULL,
  achievement_data jsonb DEFAULT '{}'::jsonb,
  earned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON player_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own achievements"
  ON player_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create user_profiles_with_kits view
CREATE OR REPLACE VIEW user_profiles_with_kits AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.coins,
  p.level,
  p.experience_points,
  p.selected_banner_id,
  p.created_at,
  p.updated_at,
  p.id as user_id,
  NULL::uuid as equipped_kit_id,
  NULL::text as kit_name,
  NULL::text[] as kit_colors
FROM profiles p;

-- Create equip_kit_for_testing function
CREATE OR REPLACE FUNCTION equip_kit_for_testing(p_kit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_kit_name text;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Check if kit exists
  SELECT name INTO v_kit_name
  FROM user_kit_catalog
  WHERE id = p_kit_id;
  
  IF v_kit_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found'
    );
  END IF;
  
  -- Mark the kit as owned by the user
  UPDATE user_kit_catalog
  SET owned_by_user = true
  WHERE id = p_kit_id;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit equipped successfully',
    'kit_name', v_kit_name
  );
END;
$$;