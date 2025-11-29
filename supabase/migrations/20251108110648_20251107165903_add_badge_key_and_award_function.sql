/*
  # Add Badge Key and Award Function

  1. Schema Changes
    - Add `badge_key` column to badge_definitions table for unique identification
    - Create index on badge_key for faster lookups

  2. Seed Data
    - Insert common badge definitions with proper badge_keys
    - Categories: Wins, Games Played, House Management, Social

  3. Functions
    - `check_and_award_badge`: Checks if user qualifies for badge and awards it
      - Parameters: user_id, badge_key
      - Returns: boolean (true if newly awarded, false if already had or doesn't qualify)
      - Validates badge exists
      - Checks if user already has badge
      - Awards badge if conditions met
      - Returns true only if badge was newly awarded

  4. Security
    - Function uses SECURITY DEFINER to bypass RLS for badge awarding
    - Validates all inputs to prevent abuse
*/

-- Add badge_key column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badge_definitions' AND column_name = 'badge_key'
  ) THEN
    ALTER TABLE badge_definitions ADD COLUMN badge_key text UNIQUE NOT NULL DEFAULT 'temp_key';
    ALTER TABLE badge_definitions ALTER COLUMN badge_key DROP DEFAULT;
  END IF;
END $$;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_badge_definitions_badge_key ON badge_definitions(badge_key);

-- Seed badge definitions (only insert if not exists)
INSERT INTO badge_definitions (badge_key, name, description, icon, rarity)
VALUES
  ('first_win', 'First Victory', 'Won your first game', '🏆', 'common'),
  ('five_wins', 'Winner', 'Won 5 games', '🎯', 'common'),
  ('ten_wins', 'Champion', 'Won 10 games', '👑', 'uncommon'),
  ('twenty_five_wins', 'Legend', 'Won 25 games', '⭐', 'rare'),
  ('fifty_wins', 'Mythic Winner', 'Won 50 games', '💎', 'epic'),
  ('games_played_10', 'Getting Started', 'Played 10 games', '🎮', 'common'),
  ('games_played_25', 'Regular Player', 'Played 25 games', '🎲', 'uncommon'),
  ('games_played_50', 'Dedicated', 'Played 50 games', '🎪', 'rare'),
  ('games_played_100', 'Hardcore Gamer', 'Played 100 games', '🔥', 'epic'),
  ('first_house', 'Homeowner', 'Created your first house', '🏠', 'common'),
  ('house_creator', 'Architect', 'Created 3 houses', '🏛️', 'uncommon'),
  ('first_friend', 'Socialite', 'Added your first friend', '👥', 'common'),
  ('five_friends', 'Popular', 'Have 5 friends', '🎉', 'uncommon'),
  ('ten_friends', 'Social Butterfly', 'Have 10 friends', '🦋', 'rare')
ON CONFLICT (badge_key) DO NOTHING;

-- Create the badge award function
CREATE OR REPLACE FUNCTION check_and_award_badge(
  p_user_id uuid,
  p_badge_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge_id uuid;
  v_already_has_badge boolean;
  v_win_count integer;
  v_games_played integer;
  v_house_count integer;
  v_friend_count integer;
  v_qualifies boolean := false;
BEGIN
  -- Get badge definition ID
  SELECT id INTO v_badge_id
  FROM badge_definitions
  WHERE badge_key = p_badge_key;

  -- If badge doesn't exist, return false
  IF v_badge_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user already has this badge
  SELECT EXISTS(
    SELECT 1 FROM user_badges
    WHERE user_id = p_user_id 
    AND badge_definition_id = v_badge_id
  ) INTO v_already_has_badge;

  -- If already has badge, return false
  IF v_already_has_badge THEN
    RETURN false;
  END IF;

  -- Check qualification based on badge_key
  CASE p_badge_key
    WHEN 'first_win' THEN
      SELECT COUNT(*) INTO v_win_count
      FROM session_scores
      WHERE user_id = p_user_id AND is_winner = true;
      v_qualifies := v_win_count >= 1;

    WHEN 'five_wins' THEN
      SELECT COUNT(*) INTO v_win_count
      FROM session_scores
      WHERE user_id = p_user_id AND is_winner = true;
      v_qualifies := v_win_count >= 5;

    WHEN 'ten_wins' THEN
      SELECT COUNT(*) INTO v_win_count
      FROM session_scores
      WHERE user_id = p_user_id AND is_winner = true;
      v_qualifies := v_win_count >= 10;

    WHEN 'twenty_five_wins' THEN
      SELECT COUNT(*) INTO v_win_count
      FROM session_scores
      WHERE user_id = p_user_id AND is_winner = true;
      v_qualifies := v_win_count >= 25;

    WHEN 'fifty_wins' THEN
      SELECT COUNT(*) INTO v_win_count
      FROM session_scores
      WHERE user_id = p_user_id AND is_winner = true;
      v_qualifies := v_win_count >= 50;

    WHEN 'games_played_10' THEN
      SELECT COUNT(DISTINCT session_id) INTO v_games_played
      FROM session_scores
      WHERE user_id = p_user_id;
      v_qualifies := v_games_played >= 10;

    WHEN 'games_played_25' THEN
      SELECT COUNT(DISTINCT session_id) INTO v_games_played
      FROM session_scores
      WHERE user_id = p_user_id;
      v_qualifies := v_games_played >= 25;

    WHEN 'games_played_50' THEN
      SELECT COUNT(DISTINCT session_id) INTO v_games_played
      FROM session_scores
      WHERE user_id = p_user_id;
      v_qualifies := v_games_played >= 50;

    WHEN 'games_played_100' THEN
      SELECT COUNT(DISTINCT session_id) INTO v_games_played
      FROM session_scores
      WHERE user_id = p_user_id;
      v_qualifies := v_games_played >= 100;

    WHEN 'first_house' THEN
      SELECT COUNT(*) INTO v_house_count
      FROM houses
      WHERE creator_id = p_user_id;
      v_qualifies := v_house_count >= 1;

    WHEN 'house_creator' THEN
      SELECT COUNT(*) INTO v_house_count
      FROM houses
      WHERE creator_id = p_user_id;
      v_qualifies := v_house_count >= 3;

    WHEN 'first_friend' THEN
      SELECT COUNT(*) INTO v_friend_count
      FROM friendships
      WHERE user_id = p_user_id;
      v_qualifies := v_friend_count >= 1;

    WHEN 'five_friends' THEN
      SELECT COUNT(*) INTO v_friend_count
      FROM friendships
      WHERE user_id = p_user_id;
      v_qualifies := v_friend_count >= 5;

    WHEN 'ten_friends' THEN
      SELECT COUNT(*) INTO v_friend_count
      FROM friendships
      WHERE user_id = p_user_id;
      v_qualifies := v_friend_count >= 10;

    ELSE
      -- Unknown badge type, return false
      RETURN false;
  END CASE;

  -- If user qualifies, award the badge
  IF v_qualifies THEN
    INSERT INTO user_badges (user_id, badge_definition_id, badge_type, is_unlocked, earned_at)
    VALUES (p_user_id, v_badge_id, p_badge_key, true, now());
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_and_award_badge(uuid, text) TO authenticated;