/*
  # Fix User Profile Settings Creation
  
  1. Changes
    - Update handle_new_user() trigger to also create user_profile_settings record
    - Set has_completed_onboarding to false for new users
    
  2. Purpose
    - Ensure new users go through onboarding flow
    - Automatically create settings record on signup
*/

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
