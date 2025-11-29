/*
  # Fix Trigger Execution Order for User Signup

  1. Changes
    - Recreate triggers with explicit ordering to ensure profile is created first
    - handle_new_user runs first (creates profile)
    - add_free_kits_to_new_user runs second (adds kits, which may need profile)
    
  2. Security
    - Both triggers run with SECURITY DEFINER to bypass RLS
    - Maintains existing security model
*/

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_add_free_kits_to_new_user ON auth.users;

-- Recreate handle_new_user trigger (runs first - alphabetically earlier name)
CREATE TRIGGER a_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Recreate add_free_kits trigger (runs second)
CREATE TRIGGER b_trigger_add_free_kits_to_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.add_free_kits_to_new_user();
