/*
  # Fix Profile Creation with Database Trigger

  1. Changes
    - Drop the restrictive INSERT policy that prevents profile creation during signup
    - Create a database trigger that automatically creates a profile when a user signs up
    - Add a function to handle new user profile creation
    
  2. Security
    - Profiles are created automatically via trigger (bypasses RLS)
    - Users can still only update their own profiles
    - All users can view profiles

  3. Notes
    - This is the standard Supabase pattern for profile creation
    - Username will be stored in auth.users metadata and synced to profiles
*/

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, coins, level, experience_points)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    0,
    1,
    0
  );
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add back a permissive INSERT policy for service role only (for edge cases)
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);
