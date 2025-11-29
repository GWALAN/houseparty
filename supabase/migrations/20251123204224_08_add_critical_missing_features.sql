/*
  # Add Critical Missing Features
  
  1. Tables
    - `player_streaks` - Track player win/loss streaks
    - `user_house_kits` - Track which kits users have unlocked
    - `user_badges` - Track earned badges
    - `blocked_users` - User blocking system
  
  2. Columns
    - games: scoring_type, lower_is_better, creator_id, deleted_at, deleted_by
    - game_sessions: house_id, is_solo_game
    - session_scores: is_winner
    - user_profile_settings: equipped_house_kit_id, is_private, has_completed_onboarding
    - houses: member_limit
    - house_members: color_scheme
  
  3. Functions
    - get_house_leaderboard - Optimized leaderboard query
    - handle_new_user - Auto-create profile on signup
  
  4. Security
    - Enable RLS on all new tables
*/

-- Add missing columns to games table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'scoring_type') THEN
    ALTER TABLE games ADD COLUMN scoring_type text DEFAULT 'highest_wins';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'lower_is_better') THEN
    ALTER TABLE games ADD COLUMN lower_is_better boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'creator_id') THEN
    ALTER TABLE games ADD COLUMN creator_id uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'deleted_at') THEN
    ALTER TABLE games ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'deleted_by') THEN
    ALTER TABLE games ADD COLUMN deleted_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add missing columns to game_sessions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'house_id') THEN
    ALTER TABLE game_sessions ADD COLUMN house_id uuid REFERENCES houses(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_sessions' AND column_name = 'is_solo_game') THEN
    ALTER TABLE game_sessions ADD COLUMN is_solo_game boolean DEFAULT false;
  END IF;
END $$;

-- Add missing columns to session_scores table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_scores' AND column_name = 'is_winner') THEN
    ALTER TABLE session_scores ADD COLUMN is_winner boolean DEFAULT false;
  END IF;
END $$;

-- Add missing columns to user_profile_settings table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_settings' AND column_name = 'equipped_house_kit_id') THEN
    ALTER TABLE user_profile_settings ADD COLUMN equipped_house_kit_id uuid REFERENCES house_kits(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_settings' AND column_name = 'is_private') THEN
    ALTER TABLE user_profile_settings ADD COLUMN is_private boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profile_settings' AND column_name = 'has_completed_onboarding') THEN
    ALTER TABLE user_profile_settings ADD COLUMN has_completed_onboarding boolean DEFAULT false;
  END IF;
END $$;

-- Add missing columns to houses table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'houses' AND column_name = 'member_limit') THEN
    ALTER TABLE houses ADD COLUMN member_limit integer DEFAULT 10;
  END IF;
END $$;

-- Add missing columns to house_members table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'house_members' AND column_name = 'color_scheme') THEN
    ALTER TABLE house_members ADD COLUMN color_scheme text[];
  END IF;
END $$;

-- Create player_streaks table
CREATE TABLE IF NOT EXISTS player_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  streak_type text NOT NULL CHECK (streak_type IN ('win', 'loss')),
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, house_id, streak_type)
);

ALTER TABLE player_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view streaks in their houses"
  ON player_streaks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = player_streaks.house_id
      AND house_members.user_id = auth.uid()
    )
  );

-- Create user_house_kits table
CREATE TABLE IF NOT EXISTS user_house_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  house_kit_id uuid NOT NULL REFERENCES house_kits(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, house_kit_id)
);

ALTER TABLE user_house_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlocked kits"
  ON user_house_kits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own unlocked kits"
  ON user_house_kits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  awarded_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_block CHECK (user_id != blocked_user_id),
  UNIQUE(user_id, blocked_user_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own blocked list"
  ON blocked_users FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create handle_new_user trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, username, created_at, updated_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)), now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- Create user_profile_settings
  INSERT INTO user_profile_settings (user_id, created_at, updated_at)
  VALUES (NEW.id, now(), now())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create get_house_leaderboard function
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
      AND COALESCE(gs.is_solo_game, false) = false
  ),
  member_stats AS (
    SELECT 
      hm.user_id,
      hm.nickname,
      p.username,
      ups.profile_photo_url,
      CASE 
        WHEN hk.color_scheme IS NOT NULL THEN jsonb_build_array(hk.color_scheme)
        ELSE '[]'::jsonb
      END as equipped_kit_colors,
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