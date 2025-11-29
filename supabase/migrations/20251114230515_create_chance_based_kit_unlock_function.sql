/*
  # Create Chance-Based Kit Unlock Function

  ## Problem
  The application calls `check_chance_based_kit_unlock` but this function was never created,
  causing 404 errors when games finish.

  ## Solution
  Create the function to handle chance-based kit unlocks:
  - Legendary kits: 0.025% (1 in 4000) chance on any game finish
  - Mythic kits: 0.015% (1 in 6667) chance on game win

  ## Function Logic
  1. Check if user already has all kits of that rarity
  2. Generate random number
  3. If random check passes, unlock a random kit of that rarity
  4. Return unlocked kit details or null

  ## Security
  Uses SECURITY DEFINER to bypass RLS for kit awarding
*/

CREATE OR REPLACE FUNCTION check_chance_based_kit_unlock(
  p_user_id uuid,
  p_condition text  -- 'game_finish' or 'game_win'
)
RETURNS TABLE (
  unlocked boolean,
  kit_id uuid,
  kit_name text,
  kit_rarity text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_rarity text;
  v_chance_percent numeric;
  v_random_roll numeric;
  v_available_kit_id uuid;
  v_kit_name text;
  v_kit_rarity text;
  v_already_has_all boolean;
BEGIN
  -- Determine rarity and chance based on condition
  IF p_condition = 'game_finish' THEN
    v_target_rarity := 'legendary';
    v_chance_percent := 0.025;  -- 0.025% = 1 in 4000
  ELSIF p_condition = 'game_win' THEN
    v_target_rarity := 'mythic';
    v_chance_percent := 0.015;  -- 0.015% = 1 in 6667
  ELSE
    -- Invalid condition, return no unlock
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Check if user already has all kits of this rarity
  SELECT NOT EXISTS (
    SELECT 1
    FROM house_kits hk
    WHERE hk.rarity = v_target_rarity
    AND hk.is_unlockable = true
    AND NOT EXISTS (
      SELECT 1 FROM user_house_kits uhk
      WHERE uhk.user_id = p_user_id
      AND uhk.house_kit_id = hk.id
    )
  ) INTO v_already_has_all;

  -- If user has all kits, no point in rolling
  IF v_already_has_all THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Roll for unlock (random between 0 and 100)
  v_random_roll := random() * 100;

  -- Check if unlock succeeded
  IF v_random_roll <= v_chance_percent THEN
    -- Get a random kit of target rarity that user doesn't have
    SELECT hk.id, hk.name, hk.rarity
    INTO v_available_kit_id, v_kit_name, v_kit_rarity
    FROM house_kits hk
    WHERE hk.rarity = v_target_rarity
    AND hk.is_unlockable = true
    AND NOT EXISTS (
      SELECT 1 FROM user_house_kits uhk
      WHERE uhk.user_id = p_user_id
      AND uhk.house_kit_id = hk.id
    )
    ORDER BY random()
    LIMIT 1;

    -- If found an available kit, unlock it
    IF v_available_kit_id IS NOT NULL THEN
      -- Insert into user_house_kits
      INSERT INTO user_house_kits (user_id, house_kit_id, unlocked_at)
      VALUES (p_user_id, v_available_kit_id, now())
      ON CONFLICT (user_id, house_kit_id) DO NOTHING;

      -- Return success with kit details
      RETURN QUERY SELECT true, v_available_kit_id, v_kit_name, v_kit_rarity;
      RETURN;
    END IF;
  END IF;

  -- No unlock occurred
  RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_chance_based_kit_unlock(uuid, text) TO authenticated;

COMMENT ON FUNCTION check_chance_based_kit_unlock IS 'Checks for chance-based kit unlocks: Legendary (0.025% on game finish) or Mythic (0.015% on game win)';
