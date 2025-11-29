/*
  # Fix Duplicate Username Constraints
  
  **CRITICAL BUG FOUND:**
  There are TWO unique constraints on profiles.username:
  1. profiles_username_key (case-sensitive)
  2. profiles_username_unique_idx (case-insensitive using LOWER)
  
  The trigger checks for duplicates case-insensitively,
  but the case-sensitive constraint still causes failures.
  
  1. Changes
    - Drop the case-sensitive unique constraint
    - Keep only the case-insensitive unique index
    
  2. Purpose
    - Fix "Database error saving new user" caused by conflicting constraints
    - Allow signup to work properly with case-insensitive username checking
*/

-- Drop the case-sensitive unique constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Verify only the case-insensitive index remains
-- (profiles_username_unique_idx on lower(username) stays)