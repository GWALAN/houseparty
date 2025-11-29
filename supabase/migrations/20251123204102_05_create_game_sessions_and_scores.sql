/*
  # Create game_sessions and session_scores tables
  
  1. New Tables
    - `game_sessions` - Individual game instances within a game
    - `session_scores` - Player scores for each game session
  
  2. Security
    - Enable RLS on both tables
    - House members can view sessions and scores for their house's games
*/

-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  session_number integer DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create session_scores table
CREATE TABLE IF NOT EXISTS session_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  placement integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_scores ENABLE ROW LEVEL SECURITY;

-- game_sessions policies
CREATE POLICY "House members can view game sessions"
  ON game_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE g.id = game_sessions.game_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "House admins can insert game sessions"
  ON game_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE g.id = game_sessions.game_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

CREATE POLICY "House admins can update game sessions"
  ON game_sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE g.id = game_sessions.game_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE g.id = game_sessions.game_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- session_scores policies
CREATE POLICY "House members can view session scores"
  ON session_scores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      JOIN games g ON g.id = gs.game_id
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE gs.id = session_scores.session_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "House admins can insert session scores"
  ON session_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      JOIN games g ON g.id = gs.game_id
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE gs.id = session_scores.session_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

CREATE POLICY "House admins can update session scores"
  ON session_scores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      JOIN games g ON g.id = gs.game_id
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE gs.id = session_scores.session_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      JOIN games g ON g.id = gs.game_id
      JOIN house_members hm ON hm.house_id = g.house_id
      WHERE gs.id = session_scores.session_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_session_scores_session_id ON session_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_session_scores_user_id ON session_scores(user_id);