/*
  # Fix add_free_kits_to_new_user Function to Bypass RLS

  1. Changes
    - Update add_free_kits_to_new_user function to properly bypass RLS
    - Set search_path for security
    - This allows the trigger to insert into user_house_kits during signup
    
  2. Security
    - Function runs as SECURITY DEFINER to bypass RLS
    - Only inserts free common kits (price_cents = 0)
    - Automatically called by trigger, not directly accessible to users
*/

-- Recreate the function with proper RLS bypass
CREATE OR REPLACE FUNCTION public.add_free_kits_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_house_kits (user_id, house_kit_id, is_active, unlocked_at)
  SELECT NEW.id, hk.id, false, now()
  FROM house_kits hk
  WHERE hk.rarity = 'common' AND hk.price_cents = 0
  ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
