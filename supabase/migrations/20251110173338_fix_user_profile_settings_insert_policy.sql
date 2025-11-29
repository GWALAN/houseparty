/*
  # Fix User Profile Settings Insert Policy
  
  1. Changes
    - Add WITH CHECK clause to user_profile_settings INSERT policies
    - This ensures the trigger can successfully insert records
    
  2. Purpose
    - Fix "Database error saving new user" by ensuring proper RLS policies
*/

-- Drop and recreate the INSERT policies with WITH CHECK clauses
DROP POLICY IF EXISTS "Allow profile settings creation" ON user_profile_settings;
DROP POLICY IF EXISTS "Postgres can insert profile settings" ON user_profile_settings;
DROP POLICY IF EXISTS "Service role can insert profile settings" ON user_profile_settings;

CREATE POLICY "Allow profile settings creation"
  ON user_profile_settings FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Postgres can insert profile settings"
  ON user_profile_settings FOR INSERT
  TO postgres
  WITH CHECK (true);

CREATE POLICY "Service role can insert profile settings"
  ON user_profile_settings FOR INSERT
  TO service_role
  WITH CHECK (true);
