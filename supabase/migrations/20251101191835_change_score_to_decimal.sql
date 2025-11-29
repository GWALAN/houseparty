/*
  # Change Score Column to Support Decimals
  
  1. Changes
    - Change session_scores.score from integer to numeric(10,2)
    - This allows storing decimal values like 3.68 for time-based scoring (seconds, minutes)
  
  2. Notes
    - Existing integer scores will be automatically converted
    - Supports up to 2 decimal places for precision (e.g., 3.68 seconds)
*/

-- Change score column to support decimals
ALTER TABLE session_scores 
ALTER COLUMN score TYPE numeric(10,2);
