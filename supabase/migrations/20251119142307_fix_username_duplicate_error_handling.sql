/*
  # Fix Username Duplicate Error Handling
  
  1. Changes
    - Update handle_new_user() trigger to reject duplicate usernames instead of auto-modifying them
    - This ensures users get clear error messages when their chosen username is taken
    - Frontend will handle the duplicate check, but this adds a database-level safeguard
    
  2. Purpose
    - Provide clear error messages for duplicate usernames
    - Prevent silent username modifications that confuse users
    - Maintain data integrity
*/

-- Update the handle_new_user function to reject duplicate usernames with clear error
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_username text;
BEGIN
  -- Get username from metadata or email
  requested_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Sanitize username: remove special characters except underscore and dash
  requested_username := regexp_replace(requested_username, '[^a-zA-Z0-9_-]', '', 'g');
  
  -- Ensure username is not empty
  IF requested_username IS NULL OR requested_username = '' THEN
    requested_username := 'user_' || substring(NEW.id::text from 1 for 8);
  END IF;
  
  -- Check if username already exists (case-insensitive)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(requested_username)) THEN
    RAISE EXCEPTION 'Username "%" is already taken. Please choose a different username.', requested_username
      USING ERRCODE = '23505'; -- unique_violation error code
  END IF;
  
  -- Insert into profiles
  INSERT INTO public.profiles (id, username, coins, level, experience_points)
  VALUES (
    NEW.id,
    requested_username,
    0,
    1,
    0
  );
  
  -- Insert into user_profile_settings
  INSERT INTO public.user_profile_settings (user_id, has_completed_onboarding)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION 
  WHEN unique_violation THEN
    -- Re-raise with a clear message
    RAISE EXCEPTION 'This username is already in use. Please choose a different username.'
      USING ERRCODE = '23505';
  WHEN OTHERS THEN
    -- Log the error with detailed information
    RAISE WARNING 'Error in handle_new_user for user % (email: %): % - %', 
      NEW.id, NEW.email, SQLERRM, SQLSTATE;
    
    -- Re-raise the error so Supabase knows signup failed
    RAISE;
END;
$$;
