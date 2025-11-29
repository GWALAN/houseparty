/*
  # Initial Schema Setup

  1. New Tables
    - `profiles` - User profile information
    - `houses` - Gaming houses/groups  
    - `house_members` - Members of houses
    - `emoji_packs` - Emoji packs for house members
    - `games` - Game sessions
    - `game_participants` - Participants in games
    - `user_profile_settings` - User profile settings
    - `user_purchases` - Track user purchases

  2. Functions
    - `create_house_with_admin` - Creates a house and adds creator as admin

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text,
  coins integer DEFAULT 0,
  level integer DEFAULT 1,
  experience_points integer DEFAULT 0,
  selected_banner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create houses table
CREATE TABLE IF NOT EXISTS houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  emoji text DEFAULT '🏠',
  invite_code text UNIQUE NOT NULL,
  banner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create house_members table
CREATE TABLE IF NOT EXISTS house_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  nickname text,
  emoji_pack_id uuid,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(house_id, user_id)
);

-- Create emoji_packs table
CREATE TABLE IF NOT EXISTS emoji_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emojis text[] NOT NULL,
  preview_emoji text NOT NULL,
  price_cents integer DEFAULT 0,
  is_free boolean DEFAULT false,
  theme_color text,
  secondary_color text,
  created_at timestamptz DEFAULT now()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name text,
  game_type text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create game_participants table
CREATE TABLE IF NOT EXISTS game_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team text,
  score integer DEFAULT 0,
  is_winner boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_profile_settings table
CREATE TABLE IF NOT EXISTS user_profile_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  profile_photo_url text,
  display_name text,
  selected_banner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_purchases table
CREATE TABLE IF NOT EXISTS user_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid,
  amount_cents integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  purchase_type text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE emoji_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Houses policies
CREATE POLICY "Users can view houses they are members of"
  ON houses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = houses.id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their houses"
  ON houses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = houses.id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = houses.id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create houses"
  ON houses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- House members policies
CREATE POLICY "Users can view their own memberships"
  ON house_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memberships"
  ON house_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update house members"
  ON house_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members hm
      WHERE hm.house_id = house_members.house_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members hm
      WHERE hm.house_id = house_members.house_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete house members"
  ON house_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members hm
      WHERE hm.house_id = house_members.house_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- Emoji packs policies
CREATE POLICY "Public read access to emoji packs"
  ON emoji_packs FOR SELECT
  TO authenticated
  USING (true);

-- Games policies
CREATE POLICY "House members can view games"
  ON games FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
      AND house_members.user_id = auth.uid()
    )
  );

CREATE POLICY "House admins can create games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );

CREATE POLICY "House admins can update games"
  ON games FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM house_members
      WHERE house_members.house_id = games.house_id
      AND house_members.user_id = auth.uid()
      AND house_members.role = 'admin'
    )
  );

-- Game participants policies
CREATE POLICY "Game participants can view game participants"
  ON game_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE g.id = game_participants.game_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "House admins can insert game participants"
  ON game_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE g.id = game_participants.game_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

CREATE POLICY "House admins can update game participants"
  ON game_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE g.id = game_participants.game_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE g.id = game_participants.game_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- User profile settings policies
CREATE POLICY "Users can view own profile settings"
  ON user_profile_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile settings"
  ON user_profile_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile settings"
  ON user_profile_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User purchases policies
CREATE POLICY "Users can view own purchases"
  ON user_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON user_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert default emoji packs
INSERT INTO emoji_packs (name, emojis, preview_emoji, price_cents, is_free, theme_color, secondary_color)
VALUES 
  ('Classic', ARRAY['🏠', '⚽', '🏀', '🎮', '🎯', '🎲', '🎳', '🎪'], '🏠', 0, true, '#10B981', '#059669'),
  ('Sports', ARRAY['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🏸'], '⚽', 0, true, '#3B82F6', '#2563EB'),
  ('Gaming', ARRAY['🎮', '🕹️', '👾', '🎯', '🎲', '🃏', '🎰', '🎪'], '🎮', 499, false, '#8B5CF6', '#7C3AED'),
  ('Animals', ARRAY['🦁', '🐯', '🐻', '🦊', '🐺', '🦅', '🦈', '🐉'], '🦁', 499, false, '#F59E0B', '#D97706')
ON CONFLICT DO NOTHING;

-- Create function to create house with admin
CREATE OR REPLACE FUNCTION create_house_with_admin(
  house_name text,
  house_description text,
  house_emoji text,
  invite_code text,
  creator_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_house_id uuid;
BEGIN
  -- Insert the house
  INSERT INTO houses (name, description, emoji, invite_code)
  VALUES (house_name, house_description, house_emoji, invite_code)
  RETURNING id INTO new_house_id;
  
  -- Add creator as admin
  INSERT INTO house_members (house_id, user_id, role)
  VALUES (new_house_id, creator_id, 'admin');
  
  RETURN new_house_id;
END;
$$;