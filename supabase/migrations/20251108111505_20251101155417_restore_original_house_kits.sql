/*
  # Restore Original House Kits
  
  ## Changes
  
  1. **Delete the incorrectly created kits**
    - Remove legendary kits (Crimson Flame, Amber Glow, etc.)
    - Remove mythic kits (Eclipse Black, Rose Gold, etc.) 
    - Remove epic purchasable kits (Neon Lime, Electric Teal, etc.)
  
  2. **Restore Original Purchasable Kits**
    - Neon Nights ($2.99)
    - Ocean Breeze ($2.99)
    - Sunset Glow ($4.99)
    - Forest Grove ($4.99)
    - Royal Purple ($7.99)
    - Cyberpunk ($7.99)
    - Galaxy ($12.99)
    - Dragon Fire ($12.99)
    - Diamond Ice ($19.99)
  
  3. **Restore Original Earnable Kits**
    - Golden Hour (legendary, earnable)
    - Aurora Borealis (mythic, earnable)
  
  ## Notes
  
  - Keeping the 10 free common single-color kits
  - All original kits had gradient color schemes (not single colors)
  - Restoring exact prices and rarities from original
*/

-- Delete the wrongly created kits
DELETE FROM kit_items WHERE house_kit_id IN (
  SELECT id FROM house_kits WHERE id::text LIKE '30000000%' 
  OR id::text LIKE '40000000%' 
  OR id::text LIKE '50000000%'
);

DELETE FROM house_kits WHERE id::text LIKE '30000000%' 
OR id::text LIKE '40000000%' 
OR id::text LIKE '50000000%';

-- Insert original purchasable house kits with gradient colors
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('11000000-0001-0000-0000-000000000001'::uuid, 'Neon Nights', 'Bright neon colors perfect for party houses', 'common', ARRAY['#FF1493', '#00FFFF', '#FF00FF'], 299, true),
  ('11000000-0002-0000-0000-000000000002'::uuid, 'Ocean Breeze', 'Cool blues and aqua tones for a refreshing look', 'common', ARRAY['#4682B4', '#5F9EA0', '#87CEEB'], 299, true),
  ('11000000-0003-0000-0000-000000000003'::uuid, 'Sunset Glow', 'Warm oranges and pinks for sunset vibes', 'uncommon', ARRAY['#FF6347', '#FF7F50', '#FFA07A'], 499, true),
  ('11000000-0004-0000-0000-000000000004'::uuid, 'Forest Grove', 'Natural greens and earth tones', 'uncommon', ARRAY['#228B22', '#32CD32', '#90EE90'], 499, true),
  ('11000000-0005-0000-0000-000000000005'::uuid, 'Royal Purple', 'Luxurious purple and gold accents', 'rare', ARRAY['#8B008B', '#9370DB', '#FFD700'], 799, true),
  ('11000000-0006-0000-0000-000000000006'::uuid, 'Cyberpunk', 'Futuristic neon pinks and electric blues', 'rare', ARRAY['#FF1493', '#00FFFF', '#9D00FF'], 799, true),
  ('11000000-0007-0000-0000-000000000007'::uuid, 'Galaxy', 'Deep space purples with star effects', 'epic', ARRAY['#4B0082', '#8A2BE2', '#9370DB'], 1299, true),
  ('11000000-0008-0000-0000-000000000008'::uuid, 'Dragon Fire', 'Intense reds and oranges with flame effects', 'epic', ARRAY['#DC143C', '#FF4500', '#FF6347'], 1299, true),
  ('11000000-0009-0000-0000-000000000009'::uuid, 'Diamond Ice', 'Pristine whites and light blues with sparkle effects', 'legendary', ARRAY['#F0FFFF', '#B0E0E6', '#ADD8E6'], 1999, true);

-- Insert original earnable house kits
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('12000000-0001-0000-0000-000000000001'::uuid, 'Golden Hour', 'Warm golds and sunset colors with premium effects', 'legendary', ARRAY['#FFD700', '#FFA500', '#FF8C00'], 0, true),
  ('12000000-0002-0000-0000-000000000002'::uuid, 'Aurora Borealis', 'Dancing greens and blues like northern lights', 'mythic', ARRAY['#00FF7F', '#7FFFD4', '#40E0D0'], 0, true);

-- Create kit items for purchasable kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('21000000-0001-0000-0000-000000000001'::uuid, 'Neon Nights Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#FF1493', '#00FFFF', '#FF00FF'),
        'text', '#FFFFFF',
        'accent', '#FF1493'
      )
    ),
    '11000000-0001-0000-0000-000000000001'::uuid, false
  ),
  ('21000000-0002-0000-0000-000000000002'::uuid, 'Ocean Breeze Items', 'common',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#4682B4', '#5F9EA0', '#87CEEB'),
        'text', '#FFFFFF',
        'accent', '#4682B4'
      )
    ),
    '11000000-0002-0000-0000-000000000002'::uuid, false
  ),
  ('21000000-0003-0000-0000-000000000003'::uuid, 'Sunset Glow Items', 'uncommon',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#FF6347', '#FF7F50', '#FFA07A'),
        'text', '#FFFFFF',
        'accent', '#FF6347'
      )
    ),
    '11000000-0003-0000-0000-000000000003'::uuid, false
  ),
  ('21000000-0004-0000-0000-000000000004'::uuid, 'Forest Grove Items', 'uncommon',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#228B22', '#32CD32', '#90EE90'),
        'text', '#FFFFFF',
        'accent', '#228B22'
      )
    ),
    '11000000-0004-0000-0000-000000000004'::uuid, false
  ),
  ('21000000-0005-0000-0000-000000000005'::uuid, 'Royal Purple Items', 'rare',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#8B008B', '#9370DB', '#FFD700'),
        'text', '#FFFFFF',
        'accent', '#8B008B'
      )
    ),
    '11000000-0005-0000-0000-000000000005'::uuid, false
  ),
  ('21000000-0006-0000-0000-000000000006'::uuid, 'Cyberpunk Items', 'rare',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#FF1493', '#00FFFF', '#9D00FF'),
        'text', '#FFFFFF',
        'accent', '#FF1493'
      )
    ),
    '11000000-0006-0000-0000-000000000006'::uuid, false
  ),
  ('21000000-0007-0000-0000-000000000007'::uuid, 'Galaxy Items', 'epic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#4B0082', '#8A2BE2', '#9370DB'),
        'text', '#FFFFFF',
        'accent', '#4B0082'
      )
    ),
    '11000000-0007-0000-0000-000000000007'::uuid, false
  ),
  ('21000000-0008-0000-0000-000000000008'::uuid, 'Dragon Fire Items', 'epic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#DC143C', '#FF4500', '#FF6347'),
        'text', '#FFFFFF',
        'accent', '#DC143C'
      )
    ),
    '11000000-0008-0000-0000-000000000008'::uuid, false
  ),
  ('21000000-0009-0000-0000-000000000009'::uuid, 'Diamond Ice Items', 'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#F0FFFF', '#B0E0E6', '#ADD8E6'),
        'text', '#1E293B',
        'accent', '#B0E0E6'
      )
    ),
    '11000000-0009-0000-0000-000000000009'::uuid, false
  );

-- Create kit items for earnable kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('22000000-0001-0000-0000-000000000001'::uuid, 'Golden Hour Items', 'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#FFD700', '#FFA500', '#FF8C00'),
        'text', '#FFFFFF',
        'accent', '#FFD700'
      )
    ),
    '12000000-0001-0000-0000-000000000001'::uuid, true
  ),
  ('22000000-0002-0000-0000-000000000002'::uuid, 'Aurora Borealis Items', 'mythic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#00FF7F', '#7FFFD4', '#40E0D0'),
        'text', '#FFFFFF',
        'accent', '#00FF7F'
      )
    ),
    '12000000-0002-0000-0000-000000000002'::uuid, true
  );