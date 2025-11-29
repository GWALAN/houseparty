/*
  # Add Ultra-Premium House Kits
  
  ## Changes
  
  1. **New Ultra-Premium Purchasable Kits**
    - Celestial Dreams ($49.99, legendary)
      - Deep cosmic purples, pinks, and golds with ethereal glow
      - Multi-dimensional gradient with star-field effect
    
    - Phantom Obsidian ($99.99, legendary)
      - Ultra-dark blacks with electric chrome accents
      - Metallic sheen with lightning bolt effects
      - Industrial luxury meets cyberpunk edge
    
    - Eternal Radiance ($399.99, mythic)
      - Holographic rainbow with pure white and gold
      - Prismatic shimmer with divine light rays
      - The ultimate luxury house kit
  
  ## Notes
  
  - These are the most expensive and visually stunning kits available
  - Each has unique multi-color gradients designed to look premium
  - All three are purchasable (not earnable)
  - Rarity: 2x legendary, 1x mythic
*/

-- Insert ultra-premium house kits with insane color schemes
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  (
    '11000000-0010-0000-0000-000000000010'::uuid,
    'Celestial Dreams',
    'Cosmic purples and ethereal pinks with golden stardust - a journey through the cosmos',
    'legendary',
    ARRAY['#1a0033', '#4B0082', '#9D00FF', '#FF1493', '#FFD700', '#FFF5E1'],
    4999,
    true
  ),
  (
    '11000000-0011-0000-0000-000000000011'::uuid,
    'Phantom Obsidian',
    'Ultra-dark elegance with electric chrome and lightning strikes - industrial luxury redefined',
    'legendary',
    ARRAY['#0a0a0a', '#1a1a2e', '#00FFFF', '#C0C0C0', '#FFD700', '#00CED1'],
    9999,
    true
  ),
  (
    '11000000-0012-0000-0000-000000000012'::uuid,
    'Eternal Radiance',
    'Holographic rainbow brilliance with divine white gold - the pinnacle of luxury',
    'mythic',
    ARRAY['#FFFFFF', '#FFD700', '#FF1493', '#9D00FF', '#00FFFF', '#FF6347', '#FFA500', '#F0F8FF'],
    39999,
    true
  );

-- Create kit items for ultra-premium kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  (
    '21000000-0010-0000-0000-000000000010'::uuid,
    'Celestial Dreams Items',
    'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#1a0033', '#4B0082', '#9D00FF', '#FF1493', '#FFD700', '#FFF5E1'),
        'text', '#FFFFFF',
        'accent', '#FFD700',
        'secondary', '#FF1493',
        'glow', '#9D00FF'
      ),
      'effects', jsonb_build_object(
        'glow', true,
        'shimmer', true,
        'particles', 'stars'
      )
    ),
    '11000000-0010-0000-0000-000000000010'::uuid,
    false
  ),
  (
    '21000000-0011-0000-0000-000000000011'::uuid,
    'Phantom Obsidian Items',
    'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#0a0a0a', '#1a1a2e', '#00FFFF', '#C0C0C0', '#FFD700', '#00CED1'),
        'text', '#FFFFFF',
        'accent', '#00FFFF',
        'secondary', '#C0C0C0',
        'glow', '#00CED1'
      ),
      'effects', jsonb_build_object(
        'metallic', true,
        'glow', true,
        'lightning', true
      )
    ),
    '11000000-0011-0000-0000-000000000011'::uuid,
    false
  ),
  (
    '21000000-0012-0000-0000-000000000012'::uuid,
    'Eternal Radiance Items',
    'mythic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#FFFFFF', '#FFD700', '#FF1493', '#9D00FF', '#00FFFF', '#FF6347', '#FFA500', '#F0F8FF'),
        'text', '#1E293B',
        'accent', '#FFD700',
        'secondary', '#FF1493',
        'glow', '#FFFFFF'
      ),
      'effects', jsonb_build_object(
        'holographic', true,
        'rainbow', true,
        'divine_rays', true,
        'prismatic', true
      )
    ),
    '11000000-0012-0000-0000-000000000012'::uuid,
    false
  );
