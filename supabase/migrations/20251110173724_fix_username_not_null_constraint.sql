/*
  # Fix Username NOT NULL Constraint
  
  1. Changes
    - Make username column NOT NULL in profiles table
    - This prevents NULL username issues during user creation
    
  2. Purpose
    - Fix "Database error saving new user" by ensuring username is always set
    - Username should never be NULL since the trigger always generates one
*/

-- First, update any existing NULL usernames (shouldn't be any, but just in case)
UPDATE public.profiles 
SET username = 'user_' || substring(id::text from 1 for 8)
WHERE username IS NULL;

-- Now make username NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN username SET NOT NULL;
