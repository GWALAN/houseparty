/*
  # Fix Weight Unit Constraint - Safe Update

  1. Changes
    - Drop existing weight_unit constraint
    - Update any existing 'lbs' data to 'lb'
    - Add new constraint allowing 'lb' instead of 'lbs'

  2. Notes
    - Uses a safe order: drop constraint first, update data, then add new constraint
    - Ensures no validation conflicts during migration
    - Aligns database with TypeScript WeightUnit type ('kg' | 'lb')
*/

-- Step 1: Drop the old constraint first
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_weight_unit_check;

-- Step 2: Update any existing games that use 'lbs' to use 'lb'
UPDATE games 
SET weight_unit = 'lb' 
WHERE weight_unit = 'lbs';

-- Step 3: Add the corrected constraint with 'lb' instead of 'lbs'
ALTER TABLE games 
ADD CONSTRAINT games_weight_unit_check 
CHECK (weight_unit IS NULL OR weight_unit IN ('kg', 'lb'));