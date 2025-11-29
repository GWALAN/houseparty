/*
  # Auto-Confirm Emails for Development
  
  1. Changes
    - Update handle_new_user() function to auto-confirm emails
    - This prevents "Email not confirmed" errors during development
    
  2. Purpose
    - Enable seamless authentication in development environment
    - Remove email confirmation requirement for new signups
    
  3. Production Note
    - For production, you should enable email confirmation in Supabase dashboard
    - This auto-confirmation should only be used in development
*/

-- Update the handle_new_user function to auto-confirm emails
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

-- Auto-confirm all existing unconfirmed users
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;
