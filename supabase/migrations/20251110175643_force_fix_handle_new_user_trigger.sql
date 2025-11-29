/*
  # Force Fix handle_new_user Trigger Function
  
  The trigger function exists but is empty (just returns new).
  This migration forces the correct implementation.
  
  1. Changes
    - Drop and recreate handle_new_user() with full logic
    - Creates profile and user_profile_settings records
    - Handles username uniqueness with case-insensitive checking
    - Includes error handling
    
  2. Purpose
    - Fix "Database error saving new user" during signup
    - Ensure all required records are created for new users
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create the complete handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
  counter int := 0;
  max_attempts int := 100;
BEGIN
  -- Get base username from metadata or email
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Sanitize username: remove special characters except underscore and dash
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_-]', '', 'g');
  
  -- Ensure username is not empty
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;
  
  -- Ensure username is unique by adding counter if needed (case-insensitive check)
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(final_username)) AND counter < max_attempts LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  
  -- If we exhausted attempts, use UUID suffix
  IF counter >= max_attempts THEN
    final_username := base_username || '_' || substring(NEW.id::text from 1 for 8);
  END IF;
  
  -- Insert into profiles
  INSERT INTO public.profiles (id, username, coins, level, experience_points)
  VALUES (
    NEW.id,
    final_username,
    0,
    1,
    0
  );
  
  -- Insert into user_profile_settings
  INSERT INTO public.user_profile_settings (user_id, has_completed_onboarding)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error with detailed information
  RAISE WARNING 'Error in handle_new_user for user % (email: %): % - %', 
    NEW.id, NEW.email, SQLERRM, SQLSTATE;
  
  -- Re-raise the error so Supabase knows signup failed
  RAISE;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT INSERT ON public.profiles TO postgres, authenticated, service_role;
GRANT INSERT ON public.user_profile_settings TO postgres, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role;

-- Ensure the function has proper ownership and permissions
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, service_role;