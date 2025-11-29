/*
  # Add All Premium House Kits
  
  Includes purchasable kits, earnable kits, and ultra-premium kits
*/

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
  ('11000000-0009-0000-0000-000000000009'::uuid, 'Diamond Ice', 'Pristine whites and light blues with sparkle effects', 'legendary', ARRAY['#F0FFFF', '#B0E0E6', '#ADD8E6'], 1999, true),
  ('11000000-0010-0000-0000-000000000010'::uuid, 'Celestial Dreams', 'Cosmic purples and ethereal pinks with golden stardust', 'legendary', ARRAY['#1a0033', '#4B0082', '#9D00FF', '#FF1493', '#FFD700', '#FFF5E1'], 4999, true),
  ('11000000-0011-0000-0000-000000000011'::uuid, 'Phantom Obsidian', 'Ultra-dark elegance with electric chrome and lightning strikes', 'legendary', ARRAY['#0a0a0a', '#1a1a2e', '#00FFFF', '#C0C0C0', '#FFD700', '#00CED1'], 9999, true),
  ('11000000-0012-0000-0000-000000000012'::uuid, 'Eternal Radiance', 'Holographic rainbow brilliance with divine white gold', 'mythic', ARRAY['#FFFFFF', '#FFD700', '#FF1493', '#9D00FF', '#00FFFF', '#FF6347', '#FFA500', '#F0F8FF'], 39999, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  color_scheme = EXCLUDED.color_scheme,
  price_cents = EXCLUDED.price_cents,
  is_active = EXCLUDED.is_active;

-- Insert original earnable house kits
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('12000000-0001-0000-0000-000000000001'::uuid, 'Golden Hour', 'Warm golds and sunset colors with premium effects', 'legendary', ARRAY['#FFD700', '#FFA500', '#FF8C00'], 0, true),
  ('12000000-0002-0000-0000-000000000002'::uuid, 'Aurora Borealis', 'Dancing greens and blues like northern lights', 'mythic', ARRAY['#00FF7F', '#7FFFD4', '#40E0D0'], 0, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  rarity = EXCLUDED.rarity,
  color_scheme = EXCLUDED.color_scheme,
  price_cents = EXCLUDED.price_cents,
  is_active = EXCLUDED.is_active;

-- Create kit items for all purchasable kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('21000000-0001-0000-0000-000000000001'::uuid, 'Neon Nights Items', 'common', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#FF1493', '#00FFFF', '#FF00FF'), 'text', '#FFFFFF', 'accent', '#FF1493')), '11000000-0001-0000-0000-000000000001'::uuid, false),
  ('21000000-0002-0000-0000-000000000002'::uuid, 'Ocean Breeze Items', 'common', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#4682B4', '#5F9EA0', '#87CEEB'), 'text', '#FFFFFF', 'accent', '#4682B4')), '11000000-0002-0000-0000-000000000002'::uuid, false),
  ('21000000-0003-0000-0000-000000000003'::uuid, 'Sunset Glow Items', 'uncommon', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#FF6347', '#FF7F50', '#FFA07A'), 'text', '#FFFFFF', 'accent', '#FF6347')), '11000000-0003-0000-0000-000000000003'::uuid, false),
  ('21000000-0004-0000-0000-000000000004'::uuid, 'Forest Grove Items', 'uncommon', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#228B22', '#32CD32', '#90EE90'), 'text', '#FFFFFF', 'accent', '#228B22')), '11000000-0004-0000-0000-000000000004'::uuid, false),
  ('21000000-0005-0000-0000-000000000005'::uuid, 'Royal Purple Items', 'rare', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#8B008B', '#9370DB', '#FFD700'), 'text', '#FFFFFF', 'accent', '#8B008B')), '11000000-0005-0000-0000-000000000005'::uuid, false),
  ('21000000-0006-0000-0000-000000000006'::uuid, 'Cyberpunk Items', 'rare', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#FF1493', '#00FFFF', '#9D00FF'), 'text', '#FFFFFF', 'accent', '#FF1493')), '11000000-0006-0000-0000-000000000006'::uuid, false),
  ('21000000-0007-0000-0000-000000000007'::uuid, 'Galaxy Items', 'epic', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#4B0082', '#8A2BE2', '#9370DB'), 'text', '#FFFFFF', 'accent', '#4B0082')), '11000000-0007-0000-0000-000000000007'::uuid, false),
  ('21000000-0008-0000-0000-000000000008'::uuid, 'Dragon Fire Items', 'epic', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#DC143C', '#FF4500', '#FF6347'), 'text', '#FFFFFF', 'accent', '#DC143C')), '11000000-0008-0000-0000-000000000008'::uuid, false),
  ('21000000-0009-0000-0000-000000000009'::uuid, 'Diamond Ice Items', 'legendary', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#F0FFFF', '#B0E0E6', '#ADD8E6'), 'text', '#1E293B', 'accent', '#B0E0E6')), '11000000-0009-0000-0000-000000000009'::uuid, false),
  ('21000000-0010-0000-0000-000000000010'::uuid, 'Celestial Dreams Items', 'legendary', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#1a0033', '#4B0082', '#9D00FF', '#FF1493', '#FFD700', '#FFF5E1'), 'text', '#FFFFFF', 'accent', '#FFD700', 'secondary', '#FF1493', 'glow', '#9D00FF'), 'effects', jsonb_build_object('glow', true, 'shimmer', true, 'particles', 'stars')), '11000000-0010-0000-0000-000000000010'::uuid, false),
  ('21000000-0011-0000-0000-000000000011'::uuid, 'Phantom Obsidian Items', 'legendary', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#0a0a0a', '#1a1a2e', '#00FFFF', '#C0C0C0', '#FFD700', '#00CED1'), 'text', '#FFFFFF', 'accent', '#00FFFF', 'secondary', '#C0C0C0', 'glow', '#00CED1'), 'effects', jsonb_build_object('metallic', true, 'glow', true, 'lightning', true)), '11000000-0011-0000-0000-000000000011'::uuid, false),
  ('21000000-0012-0000-0000-000000000012'::uuid, 'Eternal Radiance Items', 'mythic', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#FFFFFF', '#FFD700', '#FF1493', '#9D00FF', '#00FFFF', '#FF6347', '#FFA500', '#F0F8FF'), 'text', '#1E293B', 'accent', '#FFD700', 'secondary', '#FF1493', 'glow', '#FFFFFF'), 'effects', jsonb_build_object('holographic', true, 'rainbow', true, 'divine_rays', true, 'prismatic', true)), '11000000-0012-0000-0000-000000000012'::uuid, false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rarity = EXCLUDED.rarity,
  item_data = EXCLUDED.item_data,
  house_kit_id = EXCLUDED.house_kit_id,
  is_unlockable = EXCLUDED.is_unlockable;

-- Create kit items for earnable kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('22000000-0001-0000-0000-000000000001'::uuid, 'Golden Hour Items', 'legendary', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#FFD700', '#FFA500', '#FF8C00'), 'text', '#FFFFFF', 'accent', '#FFD700')), '12000000-0001-0000-0000-000000000001'::uuid, true),
  ('22000000-0002-0000-0000-000000000002'::uuid, 'Aurora Borealis Items', 'mythic', jsonb_build_object('colors', jsonb_build_object('background', jsonb_build_array('#00FF7F', '#7FFFD4', '#40E0D0'), 'text', '#FFFFFF', 'accent', '#00FF7F')), '12000000-0002-0000-0000-000000000002'::uuid, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rarity = EXCLUDED.rarity,
  item_data = EXCLUDED.item_data,
  house_kit_id = EXCLUDED.house_kit_id,
  is_unlockable = EXCLUDED.is_unlockable;