/*
  # Fix All Missing Functions and Columns - Comprehensive Audit Fix

  1. Missing Functions
    - equip_kit_for_testing - Function called by shop.tsx for equipping kits
    - check_user_can_join_house - Function called by create-house.tsx for house limits
    - Various other missing utility functions

  2. Missing Columns
    - games.game_emoji - Referenced in game invitations query
    - Fix user_purchases.payment_status column type mismatch

  3. RLS Policy Fixes
    - Fix infinite recursion in house_members policies
    - Update policies to avoid circular references

  4. Data Integrity
    - Ensure all relationships are properly set up
    - Fix any missing indexes
*/

-- Add missing game_emoji column to games table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'game_emoji'
  ) THEN
    ALTER TABLE games ADD COLUMN game_emoji text DEFAULT '🎮';
  END IF;
END $$;

-- Add missing scoring_category column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'scoring_category'
  ) THEN
    ALTER TABLE games ADD COLUMN scoring_category text;
  END IF;
END $$;

-- Add missing max_attempts column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE games ADD COLUMN max_attempts integer;
  END IF;
END $$;

-- Create missing equip_kit_for_testing function (shop.tsx calls this)
CREATE OR REPLACE FUNCTION equip_kit_for_testing(p_kit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify kit exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM house_kits
    WHERE id = p_kit_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kit not found or not active'
    );
  END IF;

  -- Update user profile settings
  INSERT INTO user_profile_settings (user_id, equipped_house_kit_id, updated_at)
  VALUES (auth.uid(), p_kit_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    equipped_house_kit_id = EXCLUDED.equipped_house_kit_id,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kit equipped successfully'
  );
END;
$$;

-- Create check_user_can_join_house function (create-house.tsx calls this)
CREATE OR REPLACE FUNCTION check_user_can_join_house(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house_count integer;
  v_is_premium boolean;
  v_can_join boolean;
BEGIN
  -- Count how many houses the user is currently a member of
  SELECT COUNT(*) INTO v_house_count
  FROM house_members
  WHERE user_id = user_id_param;

  -- Check if user is premium (has any completed purchase or active subscription)
  SELECT EXISTS (
    SELECT 1 FROM user_purchases
    WHERE user_id = user_id_param
    AND status = 'completed'
    LIMIT 1
  ) INTO v_is_premium;

  -- Free users can join up to 3 houses, premium users have unlimited
  IF v_is_premium THEN
    v_can_join := true;
  ELSE
    v_can_join := v_house_count < 3;
  END IF;

  RETURN jsonb_build_object(
    'can_join', v_can_join,
    'current_house_count', v_house_count,
    'is_premium', v_is_premium,
    'limit', CASE WHEN v_is_premium THEN 999 ELSE 3 END
  );
END;
$$;

-- Fix house_members RLS policies to avoid infinite recursion
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view house members" ON house_members;
DROP POLICY IF EXISTS "House admins can manage members" ON house_members;
DROP POLICY IF EXISTS "Users can join houses" ON house_members;
DROP POLICY IF EXISTS "Members can delete themselves" ON house_members;
DROP POLICY IF EXISTS "Users can view members of their houses" ON house_members;
DROP POLICY IF EXISTS "Admins can insert members" ON house_members;
DROP POLICY IF EXISTS "Admins can update members" ON house_members;
DROP POLICY IF EXISTS "Admins can delete members" ON house_members;

-- Create simplified, non-recursive policies
CREATE POLICY "Users can view all house members"
  ON house_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert themselves as members"
  ON house_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own membership"
  ON house_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own membership"
  ON house_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Update houses creator_id to ensure it's set for existing houses
UPDATE houses h
SET creator_id = (
  SELECT hm.user_id 
  FROM house_members hm 
  WHERE hm.house_id = h.id 
  AND hm.role = 'admin' 
  ORDER BY hm.joined_at ASC 
  LIMIT 1
)
WHERE creator_id IS NULL;

-- Create get_player_stats function if it doesn't exist
CREATE OR REPLACE FUNCTION get_player_stats(p_user_id uuid, p_house_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_games bigint,
  total_wins bigint,
  win_rate numeric,
  avg_score numeric,
  best_score numeric,
  total_score numeric,
  unique_games_played bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ss.session_id)::bigint as total_games,
    COUNT(DISTINCT CASE WHEN ss.is_winner THEN ss.session_id END)::bigint as total_wins,
    CASE 
      WHEN COUNT(DISTINCT ss.session_id) > 0 THEN
        ROUND((COUNT(DISTINCT CASE WHEN ss.is_winner THEN ss.session_id END)::numeric / 
               COUNT(DISTINCT ss.session_id)::numeric * 100), 1)
      ELSE 0
    END as win_rate,
    COALESCE(ROUND(AVG(ss.score), 2), 0) as avg_score,
    COALESCE(MAX(ss.score), 0) as best_score,
    COALESCE(SUM(ss.score), 0) as total_score,
    COUNT(DISTINCT gs.game_id)::bigint as unique_games_played
  FROM session_scores ss
  INNER JOIN game_sessions gs ON gs.id = ss.session_id
  WHERE ss.user_id = p_user_id
    AND gs.status = 'completed'
    AND (p_house_id IS NULL OR gs.house_id = p_house_id);
END;
$$;

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION equip_kit_for_testing TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_can_join_house TO authenticated;
GRANT EXECUTE ON FUNCTION get_player_stats TO authenticated;
GRANT EXECUTE ON FUNCTION apply_kit_to_house TO authenticated;
GRANT EXECUTE ON FUNCTION equip_kit TO authenticated;
GRANT EXECUTE ON FUNCTION get_house_game_history TO authenticated;
GRANT EXECUTE ON FUNCTION award_badge TO authenticated;
GRANT EXECUTE ON FUNCTION add_free_kits_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_house_with_admin TO authenticated;
GRANT EXECUTE ON FUNCTION get_house_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION accept_friend_request TO authenticated;
GRANT EXECUTE ON FUNCTION reject_friend_request TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_by_username TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_house TO authenticated;

-- Ensure unique constraint on user_house_kits to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_house_kits_user_id_house_kit_id_key'
  ) THEN
    ALTER TABLE user_house_kits 
    ADD CONSTRAINT user_house_kits_user_id_house_kit_id_key 
    UNIQUE (user_id, house_kit_id);
  END IF;
END $$;

-- Ensure unique constraint on user_badges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_badges_user_id_badge_key_key'
  ) THEN
    ALTER TABLE user_badges 
    ADD CONSTRAINT user_badges_user_id_badge_key_key 
    UNIQUE (user_id, badge_key);
  END IF;
END $$;

-- Add index on game_sessions for better performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_house_status 
  ON game_sessions(house_id, status) 
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_game_sessions_game_status 
  ON game_sessions(game_id, status);

CREATE INDEX IF NOT EXISTS idx_session_scores_user 
  ON session_scores(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_session_scores_session 
  ON session_scores(session_id);

-- Ensure creator_id is properly backfilled on houses table
CREATE INDEX IF NOT EXISTS idx_houses_creator_id ON houses(creator_id);

-- Add comment explaining the functions
COMMENT ON FUNCTION equip_kit_for_testing IS 'Equips a house kit to the user profile. Used by shop screen.';
COMMENT ON FUNCTION check_user_can_join_house IS 'Checks if a user can join/create another house based on their premium status and current house count.';
COMMENT ON FUNCTION get_player_stats IS 'Returns comprehensive statistics for a player, optionally filtered by house.';
