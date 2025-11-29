/*
  # Add Color Schemes to House Kits
  
  ## Changes
  
  1. Add `color_scheme` column to `user_kit_catalog` table
    - Stores array of color hex codes for gradient display
  
  2. Update existing kits with unique color schemes
    - Each kit gets colors matching its theme/name
  
  ## Security
  
  - No security changes needed (RLS already configured)
*/

-- Add color_scheme column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_kit_catalog' AND column_name = 'color_scheme'
  ) THEN
    ALTER TABLE user_kit_catalog ADD COLUMN color_scheme text[];
  END IF;
END $$;

-- Update existing kits with unique color schemes based on their theme
UPDATE user_kit_catalog SET color_scheme = ARRAY['#8B4513', '#D2691E', '#CD853F'] WHERE name = 'Classic House Kit';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#FF1493', '#00FFFF', '#FF00FF'] WHERE name = 'Neon Nights';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#4682B4', '#5F9EA0', '#87CEEB'] WHERE name = 'Ocean Breeze';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#FF6347', '#FF7F50', '#FFA07A'] WHERE name = 'Sunset Glow';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#228B22', '#32CD32', '#90EE90'] WHERE name = 'Forest Grove';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#8B008B', '#9370DB', '#FFD700'] WHERE name = 'Royal Purple';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#FF1493', '#00FFFF', '#9D00FF'] WHERE name = 'Cyberpunk';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#4B0082', '#8A2BE2', '#9370DB'] WHERE name = 'Galaxy';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#DC143C', '#FF4500', '#FF6347'] WHERE name = 'Dragon Fire';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#F0FFFF', '#B0E0E6', '#ADD8E6'] WHERE name = 'Diamond Ice';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#FFD700', '#FFA500', '#FF8C00'] WHERE name = 'Golden Hour';
UPDATE user_kit_catalog SET color_scheme = ARRAY['#00FF7F', '#7FFFD4', '#40E0D0'] WHERE name = 'Aurora Borealis';
