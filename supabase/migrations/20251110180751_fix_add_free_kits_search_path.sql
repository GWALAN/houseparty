/*
  # Fix add_free_kits_to_new_user Search Path
  
  The add_free_kits_to_new_user trigger function is missing the search_path setting,
  which causes it to fail when trying to access tables.
  
  1. Changes
    - Recreate add_free_kits_to_new_user with SET search_path = public
    - Ensure consistent configuration with handle_new_user
    
  2. Purpose
    - Fix "Database error saving new user" during signup
    - Ensure trigger can access public schema tables
*/

-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS public.add_free_kits_to_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.add_free_kits_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add all free house kits to the new user
  INSERT INTO user_house_kits (user_id, house_kit_id, is_active, unlocked_at)
  SELECT NEW.id, hk.id, false, now()
  FROM house_kits hk
  WHERE hk.rarity = 'common' AND hk.price_cents = 0
  ON CONFLICT (user_id, house_kit_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't block user creation
  RAISE WARNING 'Error in add_free_kits_to_new_user for user %: % - %', 
    NEW.id, SQLERRM, SQLSTATE;
  
  -- Don't re-raise - allow user creation to succeed even if kit addition fails
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_add_free_kits_to_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.add_free_kits_to_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.add_free_kits_to_new_user() TO postgres, authenticated, service_role;
ALTER FUNCTION public.add_free_kits_to_new_user() OWNER TO postgres;
