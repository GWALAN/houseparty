/*
  # Fix Missing Profile Creation Trigger
  
  1. Changes
    - Recreate handle_new_user() function to create profiles and settings
    - Recreate trigger on auth.users to automatically create profile on signup
    
  2. Purpose
    - Fix "Database error saving new user" by ensuring profile is created
    - Automatically create user_profile_settings record
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username, coins, level, experience_points)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    0,
    1,
    0
  );
  
  -- Create user profile settings with onboarding flag set to false
  INSERT INTO public.user_profile_settings (user_id, has_completed_onboarding)
  VALUES (new.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
