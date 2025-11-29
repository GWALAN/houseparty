/*
  # Add Kit Application Functions
  
  1. Functions
    - apply_kit_to_house - Apply a kit theme to a house
    - equip_kit - Equip a house kit to user profile
    - get_house_game_history - Get game history for a house
    - award_badge - Award a badge to a user
  
  2. These are critical functions used throughout the app
*/

-- Function to apply kit to house
CREATE OR REPLACE FUNCTION apply_kit_to_house(
  p_house_id uuid,
  p_kit_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kit_data jsonb;
  v_result jsonb;
BEGIN
  -- Verify user is admin of the house
  IF NOT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = p_house_id
    AND user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'User is not an admin of this house';
  END IF;

  -- Get kit data
  SELECT jsonb_build_object(
    'kit_id', id,
    'name', name,
    'rarity', rarity,
    'color_scheme', color_scheme
  ) INTO v_kit_data
  FROM house_kits
  WHERE id = p_kit_id AND is_active = true;

  IF v_kit_data IS NULL THEN
    RAISE EXCEPTION 'Kit not found or not active';
  END IF;

  -- Insert or update house customization
  INSERT INTO house_customizations (house_id, applied_by, theme_data, updated_at)
  VALUES (p_house_id, auth.uid(), v_kit_data, now())
  ON CONFLICT (house_id) 
  DO UPDATE SET 
    theme_data = EXCLUDED.theme_data,
    applied_by = EXCLUDED.applied_by,
    updated_at = now();

  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Kit applied successfully',
    'kit_data', v_kit_data
  );

  RETURN v_result;
END;
$$;

-- Function to equip kit to user profile
CREATE OR REPLACE FUNCTION equip_kit(p_kit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify kit exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM house_kits
    WHERE id = p_kit_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Kit not found or not active';
  END IF;

  -- Update user profile settings
  INSERT INTO user_profile_settings (user_id, equipped_house_kit_id, updated_at)
  VALUES (auth.uid(), p_kit_id, now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    equipped_house_kit_id = EXCLUDED.equipped_house_kit_id,
    updated_at = now();
END;
$$;

-- Function to get house game history
CREATE OR REPLACE FUNCTION get_house_game_history(p_house_id uuid, p_limit int DEFAULT 50)
RETURNS TABLE (
  session_id uuid,
  game_id uuid,
  game_name text,
  session_number int,
  started_at timestamptz,
  completed_at timestamptz,
  players jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is member of the house
  IF NOT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = p_house_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a member of this house';
  END IF;

  RETURN QUERY
  SELECT 
    gs.id as session_id,
    g.id as game_id,
    g.name as game_name,
    gs.session_number,
    gs.started_at,
    gs.completed_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', ss.user_id,
          'username', p.username,
          'nickname', hm.nickname,
          'score', ss.score,
          'placement', ss.placement,
          'is_winner', ss.is_winner
        ) ORDER BY ss.placement NULLS LAST, ss.score DESC
      ) FILTER (WHERE ss.user_id IS NOT NULL),
      '[]'::jsonb
    ) as players
  FROM game_sessions gs
  INNER JOIN games g ON g.id = gs.game_id
  LEFT JOIN session_scores ss ON ss.session_id = gs.id
  LEFT JOIN profiles p ON p.id = ss.user_id
  LEFT JOIN house_members hm ON hm.user_id = ss.user_id AND hm.house_id = p_house_id
  WHERE gs.house_id = p_house_id
    AND gs.status = 'completed'
    AND COALESCE(gs.is_solo_game, false) = false
  GROUP BY gs.id, g.id, g.name, gs.session_number, gs.started_at, gs.completed_at
  ORDER BY gs.completed_at DESC NULLS LAST, gs.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to award badge to user
CREATE OR REPLACE FUNCTION award_badge(p_user_id uuid, p_badge_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_key, awarded_at)
  VALUES (p_user_id, p_badge_key, now())
  ON CONFLICT (user_id, badge_key) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Add function to unlock free kits for new users
CREATE OR REPLACE FUNCTION add_free_kits_to_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add all free house kits to the user
  INSERT INTO user_house_kits (user_id, house_kit_id, unlocked_at)
  SELECT p_user_id, id, now()
  FROM house_kits
  WHERE price_cents = 0 AND is_active = true
  ON CONFLICT (user_id, house_kit_id) DO NOTHING;
END;
$$;

-- Update handle_new_user to include free kits
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
  
  -- Add free kits
  PERFORM add_free_kits_to_user(NEW.id);
  
  RETURN NEW;
END;
$$;