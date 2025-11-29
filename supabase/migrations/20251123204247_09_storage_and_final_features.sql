/*
  # Storage Bucket and Final Features
  
  1. Storage
    - Create avatars bucket for profile photos
    - Set up RLS policies for avatar uploads
  
  2. Additional Tables
    - `game_invitations` - Invite players to games
    - `app_logs` - Application logging
    - `analytics_events` - Track user events
  
  3. Realtime
    - Enable realtime for key tables
  
  4. Security
    - Storage policies for avatars
    - RLS for new tables
*/

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create game_invitations table
CREATE TABLE IF NOT EXISTS game_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(session_id, invitee_id)
);

ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own game invitations"
  ON game_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

CREATE POLICY "Users can create game invitations"
  ON game_invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their own game invitations"
  ON game_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- Create app_logs table
CREATE TABLE IF NOT EXISTS app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  log_level text DEFAULT 'info' CHECK (log_level IN ('debug', 'info', 'warning', 'error')),
  message text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own logs"
  ON app_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own analytics events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE game_invitations;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_house_id ON games(house_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_games_creator_id ON games(creator_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_invitee_id ON game_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_game_invitations_session_id ON game_invitations(session_id);
CREATE INDEX IF NOT EXISTS idx_player_streaks_user_house ON player_streaks(user_id, house_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

-- Update house_members policies to allow viewing members in same house
DROP POLICY IF EXISTS "Users can view their own memberships" ON house_members;
CREATE POLICY "Users can view house members in their houses"
  ON house_members FOR SELECT
  TO authenticated
  USING (
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete their own house membership (leave house)
CREATE POLICY "Users can delete their own house membership"
  ON house_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);