/*
  # Grant Permissions for Profile Creation Trigger
  
  1. Changes
    - Grant INSERT permissions on profiles and user_profile_settings to postgres role
    - Ensure the trigger function can execute with proper permissions
    
  2. Purpose
    - Fix "Database error saving new user" by ensuring trigger has permissions
*/

-- Grant necessary permissions to the postgres role for the trigger to work
GRANT INSERT ON public.profiles TO postgres;
GRANT INSERT ON public.user_profile_settings TO postgres;

-- Grant usage on sequences if they exist
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Ensure the function has proper ownership
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
