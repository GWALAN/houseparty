/*
  # Add Premium and Earnable House Kits
  
  ## Changes
  
  1. **Add Legendary Earnable Kits** (5 kits)
    - Unlocked by winning games (chance-based)
    - Single distinct colors
    - Rarity: legendary
  
  2. **Add Mythic Earnable Kits** (3 kits)
    - Unlocked by winning games (very rare chance)
    - Single distinct colors
    - Rarity: mythic
  
  3. **Add Purchasable Premium Kits** (5 kits)
    - Can be purchased with real money
    - Single distinct colors
    - Rarity: epic
  
  ## Notes
  
  - Free kits remain unchanged (10 common kits)
  - All new kits use single solid colors
  - Colors are distinct from existing free kits
*/

-- Add 5 Legendary Earnable Kits
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('30000000-0001-0000-0000-000000000001'::uuid, 'Crimson Flame', 'Deep red legendary theme', 'legendary', ARRAY['#DC2626'], 0, true),
  ('30000000-0002-0000-0000-000000000002'::uuid, 'Amber Glow', 'Warm amber legendary theme', 'legendary', ARRAY['#D97706'], 0, true),
  ('30000000-0003-0000-0000-000000000003'::uuid, 'Jade Empire', 'Rich jade legendary theme', 'legendary', ARRAY['#059669'], 0, true),
  ('30000000-0004-0000-0000-000000000004'::uuid, 'Sapphire Dream', 'Deep blue legendary theme', 'legendary', ARRAY['#2563EB'], 0, true),
  ('30000000-0005-0000-0000-000000000005'::uuid, 'Violet Storm', 'Intense violet legendary theme', 'legendary', ARRAY['#7C3AED'], 0, true);

-- Add 3 Mythic Earnable Kits
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('40000000-0001-0000-0000-000000000001'::uuid, 'Eclipse Black', 'Rare black mythic theme', 'mythic', ARRAY['#1E293B'], 0, true),
  ('40000000-0002-0000-0000-000000000002'::uuid, 'Rose Gold', 'Exclusive rose gold mythic theme', 'mythic', ARRAY['#BE185D'], 0, true),
  ('40000000-0003-0000-0000-000000000003'::uuid, 'Midnight Indigo', 'Deep indigo mythic theme', 'mythic', ARRAY['#312E81'], 0, true);

-- Add 5 Purchasable Premium Kits
INSERT INTO house_kits (id, name, description, rarity, color_scheme, price_cents, is_active)
VALUES
  ('50000000-0001-0000-0000-000000000001'::uuid, 'Neon Lime', 'Vibrant lime premium theme', 'epic', ARRAY['#84CC16'], 499, true),
  ('50000000-0002-0000-0000-000000000002'::uuid, 'Electric Teal', 'Bright teal premium theme', 'epic', ARRAY['#14B8A6'], 499, true),
  ('50000000-0003-0000-0000-000000000003'::uuid, 'Magenta Burst', 'Bold magenta premium theme', 'epic', ARRAY['#D946EF'], 499, true),
  ('50000000-0004-0000-0000-000000000004'::uuid, 'Bronze Shine', 'Metallic bronze premium theme', 'epic', ARRAY['#CA8A04'], 499, true),
  ('50000000-0005-0000-0000-000000000005'::uuid, 'Steel Blue', 'Cool steel blue premium theme', 'epic', ARRAY['#0EA5E9'], 499, true);

-- Create kit items for legendary kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('30000000-0001-0000-0000-000000000011'::uuid, 'Crimson Flame Items', 'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#DC2626'),
        'text', '#FFFFFF',
        'accent', '#DC2626'
      )
    ),
    '30000000-0001-0000-0000-000000000001'::uuid, true
  ),
  ('30000000-0002-0000-0000-000000000012'::uuid, 'Amber Glow Items', 'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#D97706'),
        'text', '#FFFFFF',
        'accent', '#D97706'
      )
    ),
    '30000000-0002-0000-0000-000000000002'::uuid, true
  ),
  ('30000000-0003-0000-0000-000000000013'::uuid, 'Jade Empire Items', 'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#059669'),
        'text', '#FFFFFF',
        'accent', '#059669'
      )
    ),
    '30000000-0003-0000-0000-000000000003'::uuid, true
  ),
  ('30000000-0004-0000-0000-000000000014'::uuid, 'Sapphire Dream Items', 'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#2563EB'),
        'text', '#FFFFFF',
        'accent', '#2563EB'
      )
    ),
    '30000000-0004-0000-0000-000000000004'::uuid, true
  ),
  ('30000000-0005-0000-0000-000000000015'::uuid, 'Violet Storm Items', 'legendary',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#7C3AED'),
        'text', '#FFFFFF',
        'accent', '#7C3AED'
      )
    ),
    '30000000-0005-0000-0000-000000000005'::uuid, true
  );

-- Create kit items for mythic kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('40000000-0001-0000-0000-000000000011'::uuid, 'Eclipse Black Items', 'mythic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#1E293B'),
        'text', '#FFFFFF',
        'accent', '#1E293B'
      )
    ),
    '40000000-0001-0000-0000-000000000001'::uuid, true
  ),
  ('40000000-0002-0000-0000-000000000012'::uuid, 'Rose Gold Items', 'mythic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#BE185D'),
        'text', '#FFFFFF',
        'accent', '#BE185D'
      )
    ),
    '40000000-0002-0000-0000-000000000002'::uuid, true
  ),
  ('40000000-0003-0000-0000-000000000013'::uuid, 'Midnight Indigo Items', 'mythic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#312E81'),
        'text', '#FFFFFF',
        'accent', '#312E81'
      )
    ),
    '40000000-0003-0000-0000-000000000003'::uuid, true
  );

-- Create kit items for purchasable premium kits
INSERT INTO kit_items (id, name, rarity, item_data, house_kit_id, is_unlockable)
VALUES
  ('50000000-0001-0000-0000-000000000011'::uuid, 'Neon Lime Items', 'epic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#84CC16'),
        'text', '#FFFFFF',
        'accent', '#84CC16'
      )
    ),
    '50000000-0001-0000-0000-000000000001'::uuid, false
  ),
  ('50000000-0002-0000-0000-000000000012'::uuid, 'Electric Teal Items', 'epic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#14B8A6'),
        'text', '#FFFFFF',
        'accent', '#14B8A6'
      )
    ),
    '50000000-0002-0000-0000-000000000002'::uuid, false
  ),
  ('50000000-0003-0000-0000-000000000013'::uuid, 'Magenta Burst Items', 'epic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#D946EF'),
        'text', '#FFFFFF',
        'accent', '#D946EF'
      )
    ),
    '50000000-0003-0000-0000-000000000003'::uuid, false
  ),
  ('50000000-0004-0000-0000-000000000014'::uuid, 'Bronze Shine Items', 'epic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#CA8A04'),
        'text', '#FFFFFF',
        'accent', '#CA8A04'
      )
    ),
    '50000000-0004-0000-0000-000000000004'::uuid, false
  ),
  ('50000000-0005-0000-0000-000000000015'::uuid, 'Steel Blue Items', 'epic',
    jsonb_build_object(
      'colors', jsonb_build_object(
        'background', jsonb_build_array('#0EA5E9'),
        'text', '#FFFFFF',
        'accent', '#0EA5E9'
      )
    ),
    '50000000-0005-0000-0000-000000000005'::uuid, false
  );
